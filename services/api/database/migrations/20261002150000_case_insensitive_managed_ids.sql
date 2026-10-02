CREATE UNIQUE INDEX IF NOT EXISTS users_generated_id_lower_per_college
  ON public.users (college_id, lower(generated_id))
  WHERE generated_id IS NOT NULL;
