-- Migration: Reconcile Provider Balances
-- This migration recalculates the wallet_balance for all providers 
-- based on their wallet_transactions to fix any discrepancies.

UPDATE providers 
SET wallet_balance = (
    SELECT COALESCE(SUM(CASE 
        WHEN type = 'earning' THEN amount 
        WHEN type = 'withdrawal' THEN -amount 
        WHEN type = 'refund' THEN -amount
        WHEN type = 'adjustment' THEN amount
        ELSE 0 
    END), 0)
    FROM wallet_transactions 
    WHERE user_id = providers.user_id
);

-- Audit log of the reconciliation
INSERT INTO wallet_transactions (id, user_id, amount, type, description, created_at)
SELECT 
    'REC-' || user_id || '-' || strftime('%s', 'now'),
    user_id,
    0,
    'adjustment',
    'Reconciliação automática de saldo executada',
    datetime('now')
FROM providers;
