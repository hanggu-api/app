PRAGMA foreign_keys=OFF;

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

PRAGMA foreign_keys=ON;
