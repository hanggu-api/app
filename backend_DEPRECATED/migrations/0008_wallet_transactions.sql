-- Migration: Create Wallet Transactions Table
-- 1. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" BIGINT NOT NULL,
    "service_id" TEXT,
    "amount" DECIMAL NOT NULL,
    "type" TEXT NOT NULL CHECK(type IN ('earning', 'withdrawal', 'refund', 'adjustment')),
    "description" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "wallet_transactions_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_requests" ("id") ON DELETE SET NULL
);

-- 2. Create index for fast lookups
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_user_id" ON "wallet_transactions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_wallet_transactions_service_id" ON "wallet_transactions" ("service_id");
