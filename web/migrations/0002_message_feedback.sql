-- FILE: migrations/0002_message_feedback.sql
-- PURPOSE: Create ci_message_feedback table — user ratings & corrections (T04-P9)
-- INVARIANTS: ci_ prefix, shared Ummat DB. Apply via: nself db migrate --app chatislam
-- DO NOT: apply to prod without Opus CR-C approval (privacy-compliance critical path)
-- CONSUMERS: chatislam/web (api/feedback, admin/feedback), Hasura metadata, privacy policy
--
-- COMPLIANCE NOTE: Privacy policy declares "ratings or corrections you submit" are collected.
-- This migration satisfies that declaration. Data collected: rating(-1/1), optional
-- correction_text (PII-scrubbed before storage), session_id, optional user_id.
--
-- Rollback: DROP TABLE ci_message_feedback;

-- ─── Up migration ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ci_message_feedback (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid        NOT NULL,                           -- references ci_messages(id)
  session_id      uuid        NOT NULL,
  user_id         uuid,                                           -- null for anonymous
  rating          smallint    NOT NULL CHECK (rating IN (-1, 1)), -- -1 = thumbs down, 1 = thumbs up
  correction_text text,                                           -- optional free-text, PII-scrubbed
  flagged_reason  text,                                           -- 'incorrect' | 'inappropriate' | 'off_topic'
  reviewed_at     timestamptz,                                    -- set by admin on review
  reviewed_by     uuid,                                           -- admin user_id
  created_at      timestamptz DEFAULT now()
);

-- Lookup by message (count thumbs per message)
CREATE INDEX IF NOT EXISTS ci_message_feedback_message_id_idx
  ON ci_message_feedback(message_id);

-- Admin review queue: unreviewed items fast scan
CREATE INDEX IF NOT EXISTS ci_message_feedback_unreviewed_idx
  ON ci_message_feedback(reviewed_at)
  WHERE reviewed_at IS NULL;

-- User history (for dedup and audit)
CREATE INDEX IF NOT EXISTS ci_message_feedback_user_idx
  ON ci_message_feedback(user_id)
  WHERE user_id IS NOT NULL;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS ci_message_feedback;
