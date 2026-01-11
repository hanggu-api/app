import { Router } from "express";
import { updateLocation, reverseGeocode } from "../controllers/locationController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// POST /api/location/update
router.post("/update", authMiddleware, updateLocation);

// GET /api/location/reverse (Não requer auth obrigatória para mapas públicos, mas pode ser útil)
router.get("/reverse", reverseGeocode);

export default router;
