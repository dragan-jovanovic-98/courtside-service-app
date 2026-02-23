-- ============================================================================
-- Phase 10: Admin Panel — Migration
-- ============================================================================
--
-- This migration:
--   1. Adds 'super_admin' to user_role enum
--   2. Adds super_admin READ policies on all major tables
--   3. Adds super_admin WRITE policies on agents, phone_numbers, verification
--   4. Seeds the super_admin user
-- ============================================================================

-- 1. Add 'super_admin' to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Helper function: check if current user is super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'super_admin'
  );
$$;

-- 3. Super admin READ policies on all major tables
-- These allow super_admins to read ALL rows regardless of org_id

CREATE POLICY "super_admin_read_all" ON organizations
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON users
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON contacts
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON leads
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON campaigns
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON agents
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON calls
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON appointments
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON action_items
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON subscriptions
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON invoices
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON verification
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON workflow_events
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON phone_numbers
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_read_all" ON notifications
  FOR SELECT USING (is_super_admin());

-- 4. Super admin WRITE policies

-- Agents: super_admin can INSERT, UPDATE, DELETE
CREATE POLICY "super_admin_write_all" ON agents
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Phone numbers: super_admin can INSERT, UPDATE, DELETE
CREATE POLICY "super_admin_write_all" ON phone_numbers
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Verification: super_admin can UPDATE (approve/reject)
CREATE POLICY "super_admin_write_all" ON verification
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Notifications: super_admin can INSERT (for sending notifications to org users)
CREATE POLICY "super_admin_insert" ON notifications
  FOR INSERT WITH CHECK (is_super_admin());

-- Users: super_admin can UPDATE (e.g., role changes)
CREATE POLICY "super_admin_write_all" ON users
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 5. Seed super_admin user
-- This runs as a DO block so it's idempotent
DO $$
BEGIN
  UPDATE users SET role = 'super_admin'
  WHERE email = 'dragan@draganjovanovic.com';
END $$;
