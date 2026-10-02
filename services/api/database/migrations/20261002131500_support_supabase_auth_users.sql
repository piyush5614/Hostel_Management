ALTER TABLE public.users
  ALTER COLUMN password DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_auth_id_unique
  ON public.users (auth_id)
  WHERE auth_id IS NOT NULL;
