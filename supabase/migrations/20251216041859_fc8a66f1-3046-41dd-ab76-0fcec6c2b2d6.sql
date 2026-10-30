-- Fix handle_new_user() function to add input validation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  display_name_value TEXT;
BEGIN
  -- Validate and sanitize display_name
  display_name_value := TRIM(COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''));
  
  -- Limit length to 100 characters
  IF LENGTH(display_name_value) > 100 THEN
    display_name_value := SUBSTRING(display_name_value, 1, 100);
  END IF;
  
  -- If empty after trim, set to NULL
  IF display_name_value = '' THEN
    display_name_value := NULL;
  END IF;
  
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, display_name_value);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;