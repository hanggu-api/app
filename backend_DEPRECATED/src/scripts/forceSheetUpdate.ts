
import { SheetsService } from '../services/sheetsService';
import dotenv from 'dotenv';
import path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function forceUpdate() {
  console.log('Iniciando atualização forçada da planilha...');
  
  try {
    const service = new SheetsService();
    console.log('Conectado ao serviço de planilhas.');
    
    const result: any = await service.exportToSheet();
    console.log('✅ Sucesso! Planilha atualizada.');
    if (result && result.count) {
        console.log(`Total de registros exportados: ${result.count}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar planilha:', error);
  } finally {
    process.exit();
  }
}

forceUpdate();
