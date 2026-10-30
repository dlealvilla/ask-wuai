-- Ensure Q&A history is private per user
ALTER TABLE public.qa_history ENABLE ROW LEVEL SECURITY;

-- Read own history
DROP POLICY IF EXISTS "Users can view their own qa history" ON public.qa_history;
CREATE POLICY "Users can view their own qa history"
ON public.qa_history
FOR SELECT
USING (auth.uid() = user_id);

-- Insert own history
DROP POLICY IF EXISTS "Users can insert their own qa history" ON public.qa_history;
CREATE POLICY "Users can insert their own qa history"
ON public.qa_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update own history (optional)
DROP POLICY IF EXISTS "Users can update their own qa history" ON public.qa_history;
CREATE POLICY "Users can update their own qa history"
ON public.qa_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete own history (optional)
DROP POLICY IF EXISTS "Users can delete their own qa history" ON public.qa_history;
CREATE POLICY "Users can delete their own qa history"
ON public.qa_history
FOR DELETE
USING (auth.uid() = user_id);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS qa_history_user_id_created_at_idx
ON public.qa_history (user_id, created_at DESC);
