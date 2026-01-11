import { Router } from 'express';
import { syncCatalog, exportCatalog, testConnection, getProfessions } from '../controllers/integrationController';

const router = Router();

// GET /integrations/test
router.get('/test', testConnection);

// GET /integrations/professions
router.get('/professions', getProfessions);

// POST /integrations/catalog/sync
router.post('/catalog/sync', syncCatalog);

// POST /integrations/catalog/export
router.post('/catalog/export', exportCatalog);

export default router;
