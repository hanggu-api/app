-- Hotfix release: ensure ON CONFLICT(queue_row_id) used by
-- upsert_notification_registry_from_queue() has a matching unique constraint.
create unique index if not exists ux_notification_registry_queue_row_id
  on public.notification_registry (queue_row_id);
