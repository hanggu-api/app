import * as fs from 'fs';
import * as path from 'path';

// input is ../../mobile_app/app.sql relative to this script
const INPUT_FILE = path.resolve(__dirname, '../../mobile_app/app.sql');
const OUTPUT_FILE = path.resolve(__dirname, 'd1_migration/app_data_import.sql');

function convert() {
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`Input file not found: ${INPUT_FILE}`);
        process.exit(1);
    }
    console.log(`Reading ${INPUT_FILE}...`);
    const content = fs.readFileSync(INPUT_FILE, 'utf8');
    const lines = content.split('\n');

    let outputSql = 'PRAGMA foreign_keys = OFF;\n\n';

    const seenTables = new Set<string>();
    const insertions: string[] = [];

    let inInsert = false;
    const IGNORED_TABLES = new Set(['_auth_otp', 'provider_schedules', 'service_requests']);

    for (const line of lines) {
        const trimmed = line.trim();

        if (!inInsert) {
            const insertMatch = trimmed.match(/^INSERT INTO `([^`]+)`/);
            if (insertMatch) {
                const tableName = insertMatch[1];
                if (!IGNORED_TABLES.has(tableName)) {
                    inInsert = true;
                    seenTables.add(tableName);
                }
            }
        }

        if (inInsert) {
            // Step 1: Clean quotes
            // Replace escaped single quotes \' with '' (standard SQL)
            // Replace escaped double quotes \" with "
            // Also replace \\ with \ (literal backshash)?
            // MySQL dump 'O\'Reilly' -> 'O''Reilly'
            let clean = line.replace(/\\'/g, "''").replace(/\\"/g, '"');

            // Step 2: Handle 0xHEX blobs -> x'HEX'
            // We must NOT do this inside strings.
            // Strings are delimited by ' after our replacement.
            // Escaped quotes are ''.

            let outputLine = '';
            let inString = false;
            let i = 0;

            while (i < clean.length) {
                const char = clean[i];

                if (char === "'") {
                    // Check for '' (escaped quote)
                    if (i + 1 < clean.length && clean[i + 1] === "'") {
                        outputLine += "''";
                        i += 2;
                        continue;
                    }
                    inString = !inString;
                    outputLine += char;
                    i++;
                    continue;
                }

                if (!inString) {
                    // Check for 0x...
                    if (char === '0' && i + 1 < clean.length && clean[i + 1] === 'x') {
                        // Look ahead for hex digits
                        let j = i + 2;
                        while (j < clean.length && /[0-9a-fA-F]/.test(clean[j])) {
                            j++;
                        }
                        if (j > i + 2) {
                            // Found 0xHEX
                            const hex = clean.substring(i + 2, j);
                            outputLine += `x'${hex}'`;
                            i = j;
                            continue;
                        }
                    }
                }

                outputLine += char;
                i++;
            }

            insertions.push(outputLine);

            if (trimmed.endsWith(';')) {
                inInsert = false;
            }
        }
    }

    // Generate DELETE statements
    console.log(`Found tables: ${Array.from(seenTables).join(', ')}`);
    Array.from(seenTables).forEach(table => {
        outputSql += `DELETE FROM \`${table}\`;\n`;
    });

    outputSql += '\n';

    // Append insertions
    insertions.forEach(ins => {
        outputSql += ins + '\n';
    });

    outputSql += '\nPRAGMA foreign_keys = ON;\n';

    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_FILE, outputSql);
    console.log(`Converted SQL saved to ${OUTPUT_FILE}`);
}

convert();
