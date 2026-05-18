-- FILE: migrations/0001_islamqa_tables.sql
-- PURPOSE: Create ci_islamqa_questions + ci_islamqa_answers tables for IslamQA merger (T03-P9)
-- INVARIANTS: ci_ prefix, shared Ummat DB on ummat-prod. Apply via nSelf CLI: nself db migrate
-- DO NOT: apply to prod without Opus CR-C approval (cross-subsystem change)
-- CONSUMERS: chatislam/web (citation.ts, api/chat), Hasura metadata
--
-- Run: nself db migrate --app chatislam
-- Rollback: see ROLLBACK section at bottom

-- ─── Up migration ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ci_islamqa_questions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id  integer     UNIQUE,                          -- islamqa.us question ID
  title_en     text        NOT NULL,
  body_en      text,
  title_ar     text,
  body_ar      text,
  category     text,
  madhab_tags  text[],
  source_url   text,
  imported_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ci_islamqa_answers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid        NOT NULL REFERENCES ci_islamqa_questions(id) ON DELETE CASCADE,
  body_en       text,
  body_ar       text,
  scholar_name  text,
  source_url    text
);

-- Full-text search index on questions (English title + body)
CREATE INDEX IF NOT EXISTS ci_islamqa_questions_fts_idx
  ON ci_islamqa_questions
  USING gin(to_tsvector('english', coalesce(title_en, '') || ' ' || coalesce(body_en, '')));

-- Category lookup index
CREATE INDEX IF NOT EXISTS ci_islamqa_questions_category_idx
  ON ci_islamqa_questions(category);

-- Answer foreign key index
CREATE INDEX IF NOT EXISTS ci_islamqa_answers_question_id_idx
  ON ci_islamqa_answers(question_id);

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- To undo this migration (no app data at risk — import-only tables):
--
-- DROP TABLE IF EXISTS ci_islamqa_answers;
-- DROP TABLE IF EXISTS ci_islamqa_questions;
