import { Router, type Request, type Response } from "express";

const router = Router();

// Mock fuel prices per state
const PRICES: Record<
  string,
  { gasoline: number; ethanol: number; diesel: number }
> = {
  "São Paulo": { gasoline: 5.49, ethanol: 3.49, diesel: 5.99 },
  "Rio de Janeiro": { gasoline: 5.89, ethanol: 3.89, diesel: 6.19 },
  "Minas Gerais": { gasoline: 5.69, ethanol: 3.69, diesel: 6.09 },
  default: { gasoline: 5.5, ethanol: 3.5, diesel: 6.0 },
};

router.get("/price", (req: Request, res: Response) => {
  const state = (req.query.state as string) || "default";
  const prices = PRICES[state] || PRICES["default"];

  // Simulate slight fluctuation
  const fluctuation = () => Math.random() * 0.1 - 0.05;

  res.json({
    success: true,
    state: state,
    prices: {
      gasoline: Number((prices.gasoline + fluctuation()).toFixed(2)),
      ethanol: Number((prices.ethanol + fluctuation()).toFixed(2)),
      diesel: Number((prices.diesel + fluctuation()).toFixed(2)),
    },
    currency: "BRL",
    updated_at: new Date().toISOString(),
  });
});

export default router;
