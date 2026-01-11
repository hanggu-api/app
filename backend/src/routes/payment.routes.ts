import { Router } from "express";
import { PaymentController } from "../controllers/paymentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Process payment (Card or Pix)
router.post("/process", authMiddleware, PaymentController.process);

// Webhook listener
router.post("/webhook", PaymentController.webhook);
router.get("/webhook", PaymentController.webhook);

export default router;
