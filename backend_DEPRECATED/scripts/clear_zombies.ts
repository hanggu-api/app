
import pool from "../src/database/db";

async function clearZombies() {
  try {
    console.log("🧹 Clearing zombie services...");
    
    // 1. Cancel all pending/waiting services older than 5 minutes (or all if user wants a clean slate)
    // The user said "cria serviços de test que nunca sao aceitos", so let's cancel ALL pending/waiting for now to stop the noise.
    const [result]: any = await pool.query(`
      UPDATE service_requests 
      SET status = 'cancelled' 
      WHERE status IN ('pending', 'waiting_payment', 'searching')
    `);

    console.log(`✅ Cancelled ${result.affectedRows} stuck services.`);

    // 2. Clear any dispatch records that might be active
    const [dispatchResult]: any = await pool.query(`
      UPDATE service_dispatches 
      SET status = 'cancelled' 
      WHERE status IN ('pending', 'searching')
    `);
    
    console.log(`✅ Cancelled ${dispatchResult.affectedRows} stuck dispatches.`);

  } catch (e) {
    console.error("❌ Error clearing zombies:", e);
  } finally {
    process.exit(0);
  }
}

clearZombies();
