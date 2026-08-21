-- Company Control Center Foundation
-- Generated: 2026-05-15

-- ==================================
-- company_college_registry
-- ==================================
CREATE TABLE IF NOT EXISTS company_college_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id UUID,
  college_name TEXT NOT NULL,
  college_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'onboarding', 'archived')),
  plan TEXT NOT NULL DEFAULT 'growth'
    CHECK (plan IN ('starter', 'growth', 'enterprise')),
  contact_email TEXT NOT NULL,
  domain TEXT NOT NULL,
  region TEXT NOT NULL,
  links JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================
-- company_privileged_action_requests
-- ==================================
CREATE TABLE IF NOT EXISTS company_privileged_action_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  college_registry_id UUID NOT NULL REFERENCES company_college_registry(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (
    action_type IN (
      'suspend_college',
      'activate_college',
      'transfer_ownership',
      'rotate_links',
      'emergency_read_only'
    )
  ),
  reason_code TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  requested_by UUID NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  required_approvals SMALLINT NOT NULL DEFAULT 2,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================
-- company_privileged_action_approvals
-- ==================================
CREATE TABLE IF NOT EXISTS company_privileged_action_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES company_privileged_action_requests(id) ON DELETE CASCADE,
  approver_user_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, approver_user_id)
);

-- ==================================
-- company_immutable_audit_logs
-- ==================================
CREATE TABLE IF NOT EXISTS company_immutable_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('college', 'governance', 'identity', 'system')),
  target_id TEXT NOT NULL,
  detail TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================================
-- Indexes
-- ==================================
CREATE INDEX IF NOT EXISTS idx_company_college_registry_status
  ON company_college_registry(status);

CREATE INDEX IF NOT EXISTS idx_company_college_registry_code
  ON company_college_registry(college_code);

CREATE INDEX IF NOT EXISTS idx_company_priv_actions_registry
  ON company_privileged_action_requests(college_registry_id);

CREATE INDEX IF NOT EXISTS idx_company_priv_actions_status
  ON company_privileged_action_requests(approval_status);

CREATE INDEX IF NOT EXISTS idx_company_audit_created_at
  ON company_immutable_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_company_audit_target
  ON company_immutable_audit_logs(target_type, target_id);

-- ==================================
-- updated_at trigger
-- ==================================
CREATE OR REPLACE FUNCTION company_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_company_college_registry_updated_at
  ON company_college_registry;
CREATE TRIGGER trg_company_college_registry_updated_at
  BEFORE UPDATE ON company_college_registry
  FOR EACH ROW EXECUTE FUNCTION company_update_updated_at_column();

DROP TRIGGER IF EXISTS trg_company_priv_actions_updated_at
  ON company_privileged_action_requests;
CREATE TRIGGER trg_company_priv_actions_updated_at
  BEFORE UPDATE ON company_privileged_action_requests
  FOR EACH ROW EXECUTE FUNCTION company_update_updated_at_column();

-- ==================================
-- RLS
-- ==================================
ALTER TABLE company_college_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_privileged_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_privileged_action_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_immutable_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_admin_manage_registry"
  ON company_college_registry
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'company_admin'
    )
  );

CREATE POLICY "company_admin_manage_actions"
  ON company_privileged_action_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'company_admin'
    )
  );

CREATE POLICY "company_admin_manage_approvals"
  ON company_privileged_action_approvals
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'company_admin'
    )
  );

CREATE POLICY "company_admin_read_audit"
  ON company_immutable_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'company_admin'
    )
  );
