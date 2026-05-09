CREATE TABLE IF NOT EXISTS public.provider_tasks (
    provider_id BIGINT REFERENCES public.providers(user_id) ON DELETE CASCADE,
    task_id BIGINT REFERENCES public.task_catalog(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    custom_price DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY(provider_id, task_id)
);

ALTER TABLE public.provider_tasks ENABLE ROW LEVEL SECURITY;
