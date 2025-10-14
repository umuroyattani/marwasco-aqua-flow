-- Add email column to profiles table
ALTER TABLE public.profiles ADD COLUMN email text;

-- Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Create trigger to sync email on auth.users update
CREATE TRIGGER on_auth_user_email_update
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Backfill existing emails
UPDATE public.profiles p
SET email = (
  SELECT email FROM auth.users WHERE id = p.user_id
)
WHERE email IS NULL;