-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user_settings table to store parent settings per user
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age_range TEXT NOT NULL DEFAULT '5-6',
  child_name TEXT DEFAULT '',
  voice_input BOOLEAN NOT NULL DEFAULT true,
  voice_output BOOLEAN NOT NULL DEFAULT true,
  selected_voice TEXT DEFAULT '',
  voice_speed NUMERIC NOT NULL DEFAULT 1.0,
  show_media BOOLEAN NOT NULL DEFAULT true,
  ai_provider TEXT NOT NULL DEFAULT 'gpt',
  pin TEXT NOT NULL DEFAULT '1234',
  timer_minutes INTEGER NOT NULL DEFAULT 0,
  answer_length NUMERIC NOT NULL DEFAULT 0.7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();