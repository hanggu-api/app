import { Router } from "express";
import { TestController } from "../controllers/testController";

const router = Router();

/**
 * Test Routes
 * 
 * GET /api/test/appointment-flow - Test complete appointment creation flow
 */
router.get("/appointment-flow", TestController.testAppointmentFlow);
router.post("/approve-payment/:serviceId", TestController.approvePayment);

export default router;
