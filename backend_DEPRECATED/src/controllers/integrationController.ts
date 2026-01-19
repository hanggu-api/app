import { Request, Response } from 'express';
import { SheetsService } from '../services/sheetsService';
import prisma from '../database/prismaClient';

export const getProfessions = async (req: Request, res: Response) => {
  try {
    const professions = await prisma.professions.findMany({
      select: { name: true, service_type: true },
      orderBy: [
        { service_type: 'asc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`Fetched ${professions.length} professions`);
    
    // Return simple array of strings
    const list = professions.map(p => p.name).filter(n => n);
    res.json({ success: true, professions: list, count: list.length });
  } catch (error: any) {
    console.error('Get professions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const testConnection = async (req: Request, res: Response) => {
  res.json({ success: true, message: "Integration Module is Online", timestamp: new Date().toISOString() });
};

// You might want to protect this with a secret key middleware if public
export const syncCatalog = async (req: Request, res: Response) => {
  try {
    const spreadsheetId = (req.body && req.body.spreadsheetId) ? req.body.spreadsheetId : process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) {
       res.status(400).json({ error: 'Spreadsheet ID is required' });
       return;
    }

    const service = new SheetsService(spreadsheetId);
    const result = await service.importFromSheet();
    
    res.json({ success: true, result });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const exportCatalog = async (req: Request, res: Response) => {
    try {
      const spreadsheetId = (req.body && req.body.spreadsheetId) ? req.body.spreadsheetId : process.env.GOOGLE_SPREADSHEET_ID;
      
      if (!spreadsheetId) {
         res.status(400).json({ error: 'Spreadsheet ID is required' });
         return;
      }
  
      const service = new SheetsService(spreadsheetId);
      const result = await service.exportToSheet();
      
      res.json({ success: true, result });
    } catch (error: any) {
      console.error('Export error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
