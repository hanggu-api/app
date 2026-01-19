import { Router } from "express";

const router = Router();

router.post("/register", (req, res) => {
  res.json({ success: true, message: "Device registered" });
});

export default router;
