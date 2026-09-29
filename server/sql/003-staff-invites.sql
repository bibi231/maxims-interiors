-- ============================================================
-- 003 — Staff invites: pending / active status for team members.
-- Safe to re-run: `npm run db:schema` skips the ALTERs once applied
-- (MySQL 8 has no ADD COLUMN IF NOT EXISTS).
--
-- invite_pending = 1  account created from Admin > Settings > Team (or
--                     `npm run staff`) and the person has not chosen a
--                     password yet. Cleared on first password set / sign-in.
-- invited_at          when the last set-up link was issued (resend updates it).
-- Existing accounts default to 0 (active).
-- ============================================================

ALTER TABLE `users` ADD COLUMN `invite_pending` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`;

ALTER TABLE `users` ADD COLUMN `invited_at` DATETIME(3) NULL AFTER `invite_pending`;
