import pool from '../../database/db';
import logger from '../../utils/logger';

export async function up() {
    try {
        logger.info("Migration: Adding detailed service statuses...");
        
        // Update Enum to include new statuses
        // Current: 'waiting_payment', 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
        // New: 'waiting_payment', 'pending', 'accepted', 'waiting_payment_remaining', 'in_progress', 'waiting_client_confirmation', 'completed', 'cancelled', 'contested'
        
        await pool.query(`
            ALTER TABLE service_requests 
            MODIFY COLUMN status ENUM(
                'waiting_payment', 
                'pending', 
                'accepted', 
                'waiting_payment_remaining', 
                'in_progress', 
                'waiting_client_confirmation', 
                'completed', 
                'cancelled',
                'contested'
            ) 
            NOT NULL DEFAULT 'waiting_payment';
        `);

        logger.info("Migration: Detailed statuses added successfully.");
    } catch (error) {
        logger.error("Migration Error:", error);
    }
}

export async function down() {
    // Reverting is risky as data might be lost if it has new statuses
    // For now, we skip revert logic or map back to closest status
}

// Auto-run if executed directly
if (require.main === module) {
    up().then(() => process.exit(0));
}
