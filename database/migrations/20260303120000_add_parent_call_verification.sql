-- Add parent call verification columns to leave_requests
-- These track whether admin/warden called the parent before approving the leave

ALTER TABLE leave_requests ADD COLUMN parent_call_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE leave_requests ADD COLUMN parent_call_timestamp TIMESTAMPTZ;
ALTER TABLE leave_requests ADD COLUMN parent_call_notes TEXT;
ALTER TABLE leave_requests ADD COLUMN parent_call_by UUID REFERENCES users(id);
