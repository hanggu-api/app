-- Migration: Add task_id field to service_requests
-- This allows linking service_requests to task_catalog (where prices and service definitions are)

ALTER TABLE service_requests 
ADD COLUMN task_id INT NULL AFTER category_id,
ADD KEY idx_task_id (task_id);

ALTER TABLE service_requests
ADD CONSTRAINT fk_service_requests_task_id 
  FOREIGN KEY (task_id) REFERENCES task_catalog(id);
