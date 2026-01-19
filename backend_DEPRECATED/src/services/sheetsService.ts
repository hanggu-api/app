import { google } from 'googleapis';
import * as fs from 'fs';
import { PrismaClient, task_catalog_pricing_type } from '@prisma/client';

const prisma = new PrismaClient();

export class SheetsService {
  private auth;
  private sheets;
  private spreadsheetId: string;

  constructor(spreadsheetId?: string) {
    this.spreadsheetId = spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || '';
    console.log('SheetsService initialized with ID:', this.spreadsheetId);

    const options: any = {
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        options.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      } catch (e) {
        console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
      }
    } else {
      options.keyFile = process.env.GOOGLE_CREDENTIALS_PATH;
    }

    this.auth = new google.auth.GoogleAuth(options);

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async importFromSheet() {
    if (!this.spreadsheetId) throw new Error("Spreadsheet ID not configured.");

    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Página1';
    const range = `${sheetName}!A2:G`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        console.log('No data found in sheet.');
        return { message: 'No data found' };
      }

      const results = {
        processed: 0,
        errors: 0,
        logs: [] as string[]
      };

      // Cache professions to avoid DB calls in loop
      const allProfessions = await prisma.professions.findMany({
        select: { id: true, name: true }
      });

      const professionMap = new Map<string, number>();
      allProfessions.forEach(p => {
        if (p.name) professionMap.set(p.name.toLowerCase().trim(), p.id);
      });

      for (const row of rows) {
        try {
          const [
            idStr,
            professionName,
            name,
            unitName,
            unitPriceStr,
            keywords,
            activeStr
          ] = row;

          if (!name || !professionName) continue;

          // Resolve Profession ID
          const professionId = professionMap.get(professionName.toString().toLowerCase().trim());

          if (!professionId) {
            // Optional: Create profession if not exists? For now, let's log error.
            throw new Error(`Profession not found: ${professionName}`);
          }

          const unit_price = parseFloat(unitPriceStr?.toString().replace(',', '.') || '0');
          const active = activeStr === 'TRUE' || activeStr === '1' || activeStr === 'true';

          const pricing_type: task_catalog_pricing_type = 'fixed';

          const data = {
            profession_id: professionId,
            name,
            pricing_type,
            unit_name: unitName || null,
            unit_price,
            keywords: keywords || null,
            active
          };

          if (idStr && idStr.trim() !== '') {
            const id = parseInt(idStr);
            await prisma.task_catalog.update({
              where: { id },
              data
            });
          } else {
            await prisma.task_catalog.create({
              data
            });
          }
          results.processed++;
        } catch (err: any) {
          console.error(`Error processing row: ${row}`, err);
          results.errors++;
          results.logs.push(`Error on row: ${err.message}`);
        }
      }

      return results;

    } catch (error) {
      console.error('The API returned an error: ' + error);
      throw error;
    }
  }

  async exportToSheet() {
    console.log('Starting exportToSheet...');
    if (!this.spreadsheetId) throw new Error("Spreadsheet ID missing");

    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Página1';
    console.log('Target Sheet Name:', sheetName);

    // Fetch sheet metadata first to get sheetId
    const sheetMetadata = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId
    });

    const sheet = sheetMetadata.data.sheets?.find(
      s => s.properties?.title === sheetName
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      throw new Error(`Sheet "${sheetName}" not found.`);
    }

    // Include profession relation to get the name
    const tasks = await prisma.task_catalog.findMany({
      orderBy: { id: 'desc' },
      include: {
        professions: {
          select: { name: true }
        }
      }
    });

    // Fetch all professions for Data Validation (Dropdown)
    const allProfessions = await prisma.professions.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    });
    const professionNames = allProfessions.map(p => p.name).filter(n => n);

    console.log(`Found ${tasks.length} tasks to export.`);

    // HEADER: Added 'EDITAR' at the end
    const values = [
      ['ID', 'Profession Name', 'Service Name', 'Unit Name', 'Unit Price', 'Keywords', 'Active', 'EDITAR']
    ];

    for (const task of tasks) {
      values.push([
        task.id.toString(),
        task.professions?.name || `Unknown (${task.profession_id})`,
        task.name,
        task.unit_name || '',
        task.unit_price.toString().replace('.', ','),
        task.keywords || '',
        task.active ? 'TRUE' : 'FALSE',
        'FALSE' // Initial state for Checkbox
      ]);
    }

    // 0. RESET COLUMNS (Crucial to remove "Table" formatting)
    // We delete columns A-I and insert them back. This strips metadata.
    try {
      console.log('Resetting columns to remove Table formatting...');
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 9
                }
              }
            },
            {
              insertDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'COLUMNS',
                  startIndex: 0,
                  endIndex: 9
                },
                inheritFromBefore: false
              }
            }
          ]
        }
      });
    } catch (e) {
      console.warn('Warning: Could not reset columns (might be harmless if sheet is empty or locked):', e);
      // Fallback: Just clear values if reset fails
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:Z`
      });
    }

    // 1. Write Data
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    // 2. Apply Data Validation (Dropdown), Checkboxes & Protection & Chart
    try {
      // Get Service Account Email for Protection
      let clientEmail = '';
      try {
        if (process.env.GOOGLE_CREDENTIALS_JSON) {
          const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
          clientEmail = creds.client_email;
        } else if (process.env.GOOGLE_CREDENTIALS_PATH) {
          const content = fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH, 'utf-8');
          const creds = JSON.parse(content);
          clientEmail = creds.client_email;
        }
      } catch (e) {
        console.error('Failed to read credentials for email:', e);
      }

      // Send requests in separate batches to avoid "typed columns" error blocking everything

      // 1. Clear Old Protections (Separate batch to avoid blocking if they are already gone)
      if (sheet && sheet.protectedRanges && sheet.protectedRanges.length > 0) {
        try {
          const deleteProtectionRequests: any[] = [];
          sheet.protectedRanges.forEach(pr => {
            if (pr.protectedRangeId) {
              deleteProtectionRequests.push({ deleteProtectedRange: { protectedRangeId: pr.protectedRangeId } });
            }
          });

          if (deleteProtectionRequests.length > 0) {
            await this.sheets.spreadsheets.batchUpdate({
              spreadsheetId: this.spreadsheetId,
              requestBody: { requests: deleteProtectionRequests }
            });
          }
        } catch (e) {
          // This is expected if 'deleteDimension' already removed them
          console.log('Info: Could not delete some protected ranges (likely already deleted by column reset).');
        }
      }

      // 2. Format Header & New Protections
      try {
        const initialRequests: any[] = [];

        // Format Header
        initialRequests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 8 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
                backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 }
              }
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)"
          }
        });

        // Protection for ID (Col A)
        initialRequests.push({
          addProtectedRange: {
            protectedRange: {
              range: { sheetId, startColumnIndex: 0, endColumnIndex: 1 },
              description: "ID Locked (System)",
              warningOnly: true, // Allow script to write, but warn user
              // editors: { users: clientEmail ? [clientEmail] : [] } 
            }
          }
        });

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests: initialRequests }
        });
      } catch (e) { console.warn('Warning: Basic formatting failed', e); }

      // 3. Dropdown for Profession (Col B)
      if (professionNames.length > 0) {
        try {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
              requests: [{
                setDataValidation: {
                  range: { sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 1, endColumnIndex: 2 },
                  rule: {
                    condition: { type: 'ONE_OF_LIST', values: professionNames.map(n => ({ userEnteredValue: n })) },
                    showCustomUi: true,
                    strict: false
                  }
                }
              }]
            }
          });
        } catch (e) { console.warn('Warning: Could not set Profession Dropdown', e); }
      }

      // 3. Format Price (Col E)
      try {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              repeatCell: {
                range: { sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 4, endColumnIndex: 5 },
                cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: 'R$ #,##0.00' } } },
                fields: 'userEnteredFormat.numberFormat'
              }
            }]
          }
        });
      } catch (e) { console.warn('Warning: Could not format Price', e); }

      // 4. Checkboxes (Active & Edit) - Critical
      try {
        const checkboxRequests: any[] = [];
        // Active
        checkboxRequests.push({
          setDataValidation: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 6, endColumnIndex: 7 },
            rule: {
              condition: { type: 'BOOLEAN' },
              showCustomUi: true
            }
          }
        });
        // EDITAR
        checkboxRequests.push({
          setDataValidation: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2000, startColumnIndex: 7, endColumnIndex: 8 },
            rule: {
              condition: { type: 'BOOLEAN' },
              showCustomUi: true
            }
          }
        });

        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests: checkboxRequests }
        });
        console.log('Checkboxes updated successfully.');
      } catch (e) { console.error('Error setting checkboxes:', e); }

      console.log('Sheet update process finished.');
    } catch (e) {
      console.warn('Error applying sheet formatting/protection:', e);
    }

    return { count: tasks.length };
  }
}
