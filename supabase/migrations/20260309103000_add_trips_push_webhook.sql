-- Add webhook trigger for Uber trips so status changes call push-notifications.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_push_notifications()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://mroesvsmylnaxelrhqtl.supabase.co/functions/v1/push-notifications',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD),
        'table', TG_TABLE_NAME,
        'type', TG_OP
      )
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_trip_change_push_notifications ON public.trips;

CREATE TRIGGER on_trip_change_push_notifications
  AFTER INSERT OR UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notifications();
