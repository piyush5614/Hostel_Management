ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS end_date timestamptz,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'academic',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS max_participants integer,
  ADD COLUMN IF NOT EXISTS registration_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS registration_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

UPDATE public.events SET end_date = event_date WHERE end_date IS NULL;
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS attended boolean NOT NULL DEFAULT false;
