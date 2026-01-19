-- Migration: Add 'client_departing' and 'client_arrived' to service_requests status check constraint (SAFE MODE)

PRAGMA foreign_keys=OFF;

-- 1. Create new table with updated CHECK constraint
DROP TABLE IF EXISTS "service_requests_new";
CREATE TABLE "service_requests_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "client_id" BIGINT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "profession" TEXT,
    "provider_id" BIGINT,
    "description" TEXT,
    "status" TEXT NOT NULL CHECK(status IN ('waiting_payment','pending','accepted','waiting_payment_remaining','in_progress','waiting_client_confirmation','completed','cancelled','contested','expired','open_for_schedule','schedule_proposed','scheduled','offered','client_departing','client_arrived')) DEFAULT 'waiting_payment',
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "address" TEXT,
    "price_estimated" DECIMAL,
    "price_upfront" DECIMAL,
    "provider_amount" DECIMAL,
    "scheduled_at" DATETIME,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "location_type" TEXT DEFAULT 'client',
    "arrived_at" DATETIME,
    "payment_remaining_status" TEXT DEFAULT 'pending',
    "contest_reason" TEXT,
    "contest_status" TEXT DEFAULT 'none',
    "contest_evidence" TEXT,
    "validation_code" TEXT,
    "proof_photo" TEXT,
    "proof_video" TEXT,
    "proof_code" TEXT,
    "completion_code" TEXT,
    "completion_requested_at" DATETIME,
    "status_updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "profession_id" INTEGER,
    "started_at" DATETIME,
    "finished_at" DATETIME,
    "task_id" INTEGER,
    "notification_attempts" INTEGER DEFAULT 0,
    "last_notification_at" DATETIME,
    "is_dismissed" INTEGER DEFAULT 0,
    "departure_alert_sent" BOOLEAN DEFAULT FALSE,
    CONSTRAINT "service_requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_requests_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers" ("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "service_requests_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task_catalog" ("id")
);

-- 2. Copy data (SAFE MODE - Only columns known to exist in older schema versions)
INSERT INTO service_requests_new (
    id, client_id, category_id, profession, provider_id, description, status, latitude, longitude, address, 
    price_estimated, price_upfront, provider_amount, scheduled_at, created_at, location_type, arrived_at, 
    payment_remaining_status, contest_reason, contest_status, contest_evidence, validation_code, proof_photo, 
    proof_video, proof_code, completion_code, completion_requested_at, status_updated_at, completed_at, 
    profession_id, started_at, finished_at
)
SELECT 
    id, client_id, category_id, profession, provider_id, description, status, latitude, longitude, address, 
    price_estimated, price_upfront, provider_amount, scheduled_at, created_at, location_type, arrived_at, 
    payment_remaining_status, contest_reason, contest_status, contest_evidence, validation_code, proof_photo, 
    proof_video, proof_code, completion_code, completion_requested_at, status_updated_at, completed_at, 
    profession_id, started_at, finished_at
FROM service_requests;

-- 3. Replace table
DROP TABLE service_requests;
ALTER TABLE service_requests_new RENAME TO service_requests;

-- 4. Recreate indices
CREATE INDEX IF NOT EXISTS "idx_service_requests_client_id" ON "service_requests" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_service_requests_provider_id" ON "service_requests" ("provider_id");
CREATE INDEX IF NOT EXISTS "idx_service_requests_status" ON "service_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_service_requests_category_id" ON "service_requests" ("category_id");

PRAGMA foreign_keys=ON;
