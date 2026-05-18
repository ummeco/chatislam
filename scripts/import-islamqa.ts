#!/usr/bin/env tsx
/**
 * ChatIslam — IslamQA Import Script (T03-P9)
 *
 * Imports IslamQA Q&A export JSON into ci_islamqa_questions + ci_islamqa_answers
 * via Hasura admin API (upsert on original_id — safe to re-run).
 *
 * Usage:
 *   pnpm tsx scripts/import-islamqa.ts --dry-run            # count records, no writes
 *   pnpm tsx scripts/import-islamqa.ts --file ./export.json # import from custom file
 *   pnpm tsx scripts/import-islamqa.ts                      # import from islamqa-export.json
 *
 * Prerequisites:
 *   1. HASURA_ADMIN_URL + HASURA_GRAPHQL_ADMIN_SECRET in env (or .env.local)
 *   2. islamqa-export.json (user-supplied IslamQA data export)
 *   3. Migration 0001_islamqa_tables.sql applied to DB
 *
 * Expected export format (one of):
 *   - Array of { id, title_en, body_en, title_ar?, body_ar?, category?, madhab_tags?, source_url?,
 *                answers: [{ body_en?, body_ar?, scholar_name?, source_url? }] }
 *   - Or a top-level object { questions: [...] }
 */

import * as fs   from 'fs'
import * as path from 'path'

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2)
const dryRun     = args.includes('--dry-run')
const fileArgIdx = args.indexOf('--file')
const exportFile = fileArgIdx !== -1 && args[fileArgIdx + 1]
  ? args[fileArgIdx + 1]!
  : path.join(process.cwd(), 'islamqa-export.json')

// ─── Types ────────────────────────────────────────────────────────────────────

interface IslamQAAnswer {
  body_en?:      string
  body_ar?:      string
  scholar_name?: string
  source_url?:   string
}

interface IslamQAQuestion {
  id:           number
  title_en:     string
  body_en?:     string
  title_ar?:    string
  body_ar?:     string
  category?:    string
  madhab_tags?: string[]
  source_url?:  string
  answers?:     IslamQAAnswer[]
}

// ─── Hasura client ────────────────────────────────────────────────────────────

function getEnv(key: string): string {
  // Try process.env first, then .env.local
  if (process.env[key]) return process.env[key]!
  const envLocal = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envLocal)) {
    const lines = fs.readFileSync(envLocal, 'utf-8').split('\n')
    for (const line of lines) {
      const match = line.match(new RegExp(`^${key}=(.+)$`))
      if (match) return match[1]!.replace(/^["']|["']$/g, '')
    }
  }
  return ''
}

async function hasuraAdminQuery(
  query:     string,
  variables: Record<string, unknown>,
): Promise<unknown> {
  const url    = getEnv('HASURA_ADMIN_URL') || getEnv('NEXT_PUBLIC_HASURA_URL')
  const secret = getEnv('HASURA_GRAPHQL_ADMIN_SECRET') || getEnv('HASURA_ADMIN_SECRET')

  if (!url || !secret) {
    throw new Error(
      'Missing HASURA_ADMIN_URL or HASURA_GRAPHQL_ADMIN_SECRET in env / .env.local',
    )
  }

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': secret,
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    throw new Error(`Hasura HTTP error ${res.status}: ${await res.text()}`)
  }

  const data = await res.json() as { data?: unknown; errors?: Array<{ message: string }> }
  if (data.errors?.length) {
    throw new Error(`Hasura GraphQL error: ${data.errors.map((e) => e.message).join(', ')}`)
  }

  return data.data
}

// ─── Batch insert mutations ───────────────────────────────────────────────────

const UPSERT_QUESTIONS = `
  mutation UpsertIslamQAQuestions($objects: [ci_islamqa_questions_insert_input!]!) {
    insert_ci_islamqa_questions(
      objects: $objects,
      on_conflict: {
        constraint: ci_islamqa_questions_original_id_key,
        update_columns: [title_en, body_en, title_ar, body_ar, category, madhab_tags, source_url]
      }
    ) {
      affected_rows
      returning { id original_id }
    }
  }
`

const UPSERT_ANSWERS = `
  mutation UpsertIslamQAAnswers($objects: [ci_islamqa_answers_insert_input!]!) {
    insert_ci_islamqa_answers(
      objects: $objects,
      on_conflict: {
        constraint: ci_islamqa_answers_pkey,
        update_columns: [body_en, body_ar, scholar_name, source_url]
      }
    ) {
      affected_rows
    }
  }
`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[islamqa-import] mode=${dryRun ? 'dry-run' : 'live'} file=${exportFile}`)

  // ── Load export file ──
  if (!fs.existsSync(exportFile)) {
    console.error(`[islamqa-import] ERROR: Export file not found: ${exportFile}`)
    console.error('  Supply the IslamQA data export as islamqa-export.json or --file <path>')
    process.exit(1)
  }

  const rawJson = fs.readFileSync(exportFile, 'utf-8')
  let rawData: unknown
  try {
    rawData = JSON.parse(rawJson) as unknown
  } catch (err) {
    console.error('[islamqa-import] ERROR: Failed to parse JSON export:', err)
    process.exit(1)
  }

  // Support both top-level array and { questions: [...] }
  const questions: IslamQAQuestion[] = Array.isArray(rawData)
    ? rawData as IslamQAQuestion[]
    : (rawData as { questions?: IslamQAQuestion[] }).questions ?? []

  console.log(`[islamqa-import] Found ${questions.length} questions in export`)

  if (dryRun) {
    const answerCount = questions.reduce((acc, q) => acc + (q.answers?.length ?? 0), 0)
    console.log(`[islamqa-import] Dry-run: would insert ${questions.length} questions + ${answerCount} answers`)
    console.log('[islamqa-import] Dry-run complete — no writes performed')
    return
  }

  // ── Batch insert questions (100 per batch) ──
  const BATCH = 100
  let totalQInserted = 0

  const questionIdMap = new Map<number, string>() // original_id → DB uuid

  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH)
    const objects = batch.map((q) => ({
      original_id:  q.id,
      title_en:     q.title_en,
      body_en:      q.body_en ?? null,
      title_ar:     q.title_ar ?? null,
      body_ar:      q.body_ar ?? null,
      category:     q.category ?? null,
      madhab_tags:  q.madhab_tags ?? null,
      source_url:   q.source_url ?? null,
    }))

    const result = await hasuraAdminQuery(UPSERT_QUESTIONS, { objects }) as {
      insert_ci_islamqa_questions?: {
        affected_rows: number
        returning: Array<{ id: string; original_id: number }>
      }
    }

    const inserted = result.insert_ci_islamqa_questions
    if (inserted) {
      totalQInserted += inserted.affected_rows
      for (const row of inserted.returning) {
        questionIdMap.set(row.original_id, row.id)
      }
    }

    const done = Math.min(i + BATCH, questions.length)
    console.log(`[islamqa-import] Questions ${done}/${questions.length} (${inserted?.affected_rows ?? 0} upserted)`)
  }

  console.log(`[islamqa-import] Questions complete: ${totalQInserted} total upserted`)

  // ── Batch insert answers ──
  const allAnswers: Array<{
    question_id:  string
    body_en:      string | null
    body_ar:      string | null
    scholar_name: string | null
    source_url:   string | null
  }> = []

  for (const q of questions) {
    const qUuid = questionIdMap.get(q.id)
    if (!qUuid || !q.answers?.length) continue
    for (const a of q.answers) {
      allAnswers.push({
        question_id:  qUuid,
        body_en:      a.body_en      ?? null,
        body_ar:      a.body_ar      ?? null,
        scholar_name: a.scholar_name ?? null,
        source_url:   a.source_url   ?? null,
      })
    }
  }

  let totalAInserted = 0
  for (let i = 0; i < allAnswers.length; i += BATCH) {
    const batch = allAnswers.slice(i, i + BATCH)
    const result = await hasuraAdminQuery(UPSERT_ANSWERS, { objects: batch }) as {
      insert_ci_islamqa_answers?: { affected_rows: number }
    }
    const inserted = result.insert_ci_islamqa_answers?.affected_rows ?? 0
    totalAInserted += inserted
    const done = Math.min(i + BATCH, allAnswers.length)
    console.log(`[islamqa-import] Answers ${done}/${allAnswers.length} (${inserted} upserted)`)
  }

  console.log(`[islamqa-import] Import complete: ${totalQInserted} questions, ${totalAInserted} answers`)
}

main().catch((err) => {
  console.error('[islamqa-import] Fatal error:', err)
  process.exit(1)
})
