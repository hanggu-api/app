-- Allow anonymous read access to task catalogs and AI training data
CREATE POLICY "Allow public read access to task_catalog" ON public.task_catalog FOR SELECT USING (true);
CREATE POLICY "Allow public read access to task_training_data" ON public.task_training_data FOR SELECT USING (true);
