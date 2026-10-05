ALTER TABLE public.staff_tasks
  ADD COLUMN IF NOT EXISTS photo_submission_status text,
  ADD COLUMN IF NOT EXISTS photo_approved_by uuid,
  ADD COLUMN IF NOT EXISTS photo_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS work_in_progress_photos text[],
  ADD COLUMN IF NOT EXISTS reassigned_from uuid,
  ADD COLUMN IF NOT EXISTS reassigned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.staff_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  user_role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments(task_id, created_at);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public.task_comments TO service_role;
