const num = (v: any, def: number) => {
  const n = Number(v);
  return isFinite(n) && !isNaN(n) ? n : def;
};

export const COMMISSION_PERCENT = num(process.env.COMMISSION_PERCENT, 0.12);
export const DISPATCH_TIMEOUT_MS = num(process.env.DISPATCH_TIMEOUT_MS, 30000); // 30 seconds default
export const MAX_DISPATCH_CYCLES = num(process.env.MAX_DISPATCH_CYCLES, 3); // 3 cycles default

export const TRAVEL_COST_PER_KM = num(process.env.TRAVEL_COST_PER_KM, 0);
export const MIN_TRAVEL_COST = num(process.env.MIN_TRAVEL_COST, 0);
export const TRAVEL_COST_FIXED = num(process.env.TRAVEL_COST_FIXED, 0);
export const LINKING_FEE_FIXED = num(process.env.LINKING_FEE_FIXED, 30);
export const REQUIRE_LOCATION_START =
  process.env.REQUIRE_LOCATION_START === "true";

export const JWT_SECRET =
  process.env.JWT_SECRET || "dev_secret_key_change_in_prod";

export const commissionNet = (gross: number) => {
  const net = gross * (1 - COMMISSION_PERCENT);
  return Math.round(net * 100) / 100;
};

export default {
  COMMISSION_PERCENT,
  DISPATCH_TIMEOUT_MS,
  MAX_DISPATCH_CYCLES,
  TRAVEL_COST_PER_KM,
  MIN_TRAVEL_COST,
  TRAVEL_COST_FIXED,
  LINKING_FEE_FIXED,
  REQUIRE_LOCATION_START,
  JWT_SECRET,
  commissionNet,
};
