# Supabase migrations

Apply `20261019231000_gate_movement_system.sql`, `20261019231500_gate_movement_rpcs.sql`, and then `20261020003000_gate_student_initiated_requests.sql`, in that order, in the Supabase Dashboard SQL Editor for the project configured in `services/api/.env`. Review the SQL and verify the project is the intended environment before running it. The migrations are transactional; they create the gate QR, movement, and audit tables and the transaction-safe RPC functions used by the API. The latest migration makes students explicitly start each new outing from their dashboard, requires staff to scan that pending request, and prevents a scan while the student is IN from creating another outing.

If the migration needs to be reverted, run `20261019231000_gate_movement_system_rollback.sql` in the same project's SQL Editor. Rollback permanently deletes gate QR records, movement history, and audit events; export or back up any data that must be retained first.

The existing `rooms` schema has no hostel-block field. The migration adds nullable `rooms.block`; existing rooms remain unassigned until an administrator populates that field. Curfew configuration is not present, so `is_late_return` defaults to `false` until a curfew setting is introduced.

RLS is enabled on all new gate tables with no client-role policies. Access is intended to go through the API's service-role client, with tenant filters derived from the authenticated user's verified JWT.
