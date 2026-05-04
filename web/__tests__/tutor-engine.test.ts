/**
 * ChatIslam — AI Tutor Engine tests (CB-03 T27)
 *
 * Tests scoreMastery, adjustLevel, computeStreak, buildTutorSystemPrompt.
 * All functions are deterministic — no AI calls, no mocks needed.
 */

import { describe, it, expect } from 'vitest'
import {
  scoreMastery,
  adjustLevel,
  computeStreak,
  buildTutorSystemPrompt,
  type CiTutorLesson,
  type CiTutorSession,
} from '../lib/tutor-engine'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseLesson: CiTutorLesson = {
  id:                     'lesson-001',
  path_id:                'path-001',
  lesson_number:          1,
  slug:                   'five-pillars',
  title:                  'The Five Pillars of Islam',
  objective:              'The student can name and briefly describe all five pillars.',
  system_prompt_addendum: 'Focus on practical understanding, not rote memorisation.',
  mastery_questions: [
    { q: 'What are the five pillars?', answer_keywords: ['shahada', 'salah', 'zakat', 'sawm', 'hajj'] },
    { q: 'What is the first pillar?',  answer_keywords: ['shahada', 'testimony', 'declaration'] },
  ],
  prerequisite_lesson_id: null,
  created_at:             '2026-05-01T00:00:00Z',
}

const baseSession: CiTutorSession = {
  id:                'session-001',
  user_id:           'user-001',
  path_id:           'path-001',
  current_lesson_id: 'lesson-001',
  level:             'beginner',
  mastery_scores:    {},
  streak_days:       1,
  last_active_at:    null,
  completed_at:      null,
  created_at:        '2026-05-01T00:00:00Z',
}

// ─── scoreMastery ─────────────────────────────────────────────────────────────

describe('scoreMastery', () => {
  it('returns high score when all keywords present', () => {
    const response = 'The five pillars are shahada, salah, zakat, sawm, and hajj. The shahada is the testimony.'
    const score = scoreMastery(response, baseLesson)
    expect(score).toBeGreaterThan(80)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns lower score when few keywords present', () => {
    const response = 'I know there are five things in Islam but I cannot remember them all.'
    const score = scoreMastery(response, baseLesson)
    expect(score).toBeLessThan(50)
  })

  it('returns minimum score (15) for any response attempted', () => {
    const response = 'I do not know.'
    const score = scoreMastery(response, baseLesson)
    expect(score).toBeGreaterThanOrEqual(15)
  })

  it('is case-insensitive for keyword matching', () => {
    const response = 'SHAHADA SALAH ZAKAT SAWM HAJJ TESTIMONY DECLARATION'
    const score = scoreMastery(response, baseLesson)
    expect(score).toBe(100)
  })

  it('returns 50 for non-empty response when no mastery questions defined', () => {
    const emptyLesson: CiTutorLesson = {
      ...baseLesson,
      mastery_questions: [],
    }
    const score = scoreMastery('This is a fairly long response about Islam.', emptyLesson)
    expect(score).toBe(50)
  })

  it('returns 20 for very short response with no mastery questions', () => {
    const emptyLesson: CiTutorLesson = {
      ...baseLesson,
      mastery_questions: [],
    }
    const score = scoreMastery('ok', emptyLesson)
    expect(score).toBe(20)
  })

  it('score is between 0 and 100 inclusive', () => {
    const responses = [
      '',
      'a',
      'shahada',
      'shahada salah zakat sawm hajj testimony declaration',
      'The five pillars are shahada salah zakat sawm and hajj. shahada means testimony and declaration.',
    ]
    for (const r of responses) {
      const score = scoreMastery(r, baseLesson)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('partial keyword match returns intermediate score', () => {
    const response = 'The pillars include shahada and salah.'
    const score = scoreMastery(response, baseLesson)
    // 2 keywords matched out of 8 total = 25%, scaled up from floor 15
    expect(score).toBeGreaterThanOrEqual(15)
    expect(score).toBeLessThan(80)
  })
})

// ─── adjustLevel ─────────────────────────────────────────────────────────────

describe('adjustLevel', () => {
  it('does not change level when no mastery scores', () => {
    const session = { ...baseSession, level: 'beginner' as const, mastery_scores: {} }
    expect(adjustLevel(session)).toBe('beginner')
  })

  it('advances beginner to intermediate when average >= advance threshold', () => {
    // Default threshold is 80
    const session: CiTutorSession = {
      ...baseSession,
      level: 'beginner',
      mastery_scores: { 'l1': 90, 'l2': 85, 'l3': 88 },
    }
    expect(adjustLevel(session)).toBe('intermediate')
  })

  it('advances intermediate to advanced when average >= advance threshold', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'intermediate',
      mastery_scores: { 'l1': 90, 'l2': 82, 'l3': 91 },
    }
    expect(adjustLevel(session)).toBe('advanced')
  })

  it('stays at advanced when already advanced and scores high', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'advanced',
      mastery_scores: { 'l1': 95, 'l2': 90 },
    }
    expect(adjustLevel(session)).toBe('advanced')
  })

  it('regresses advanced to intermediate when average < regress threshold', () => {
    // Default regress threshold is 30
    const session: CiTutorSession = {
      ...baseSession,
      level: 'advanced',
      mastery_scores: { 'l1': 20, 'l2': 25, 'l3': 28 },
    }
    expect(adjustLevel(session)).toBe('intermediate')
  })

  it('regresses intermediate to beginner when average < regress threshold', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'intermediate',
      mastery_scores: { 'l1': 15, 'l2': 20 },
    }
    expect(adjustLevel(session)).toBe('beginner')
  })

  it('stays at beginner when already beginner and scores low', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'beginner',
      mastery_scores: { 'l1': 10, 'l2': 15 },
    }
    expect(adjustLevel(session)).toBe('beginner')
  })

  it('keeps level unchanged when average is between thresholds', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'intermediate',
      mastery_scores: { 'l1': 50, 'l2': 60, 'l3': 55 },
    }
    expect(adjustLevel(session)).toBe('intermediate')
  })

  it('handles single mastery score', () => {
    const session: CiTutorSession = {
      ...baseSession,
      level: 'beginner',
      mastery_scores: { 'l1': 85 },
    }
    expect(adjustLevel(session)).toBe('intermediate')
  })
})

// ─── computeStreak ────────────────────────────────────────────────────────────

describe('computeStreak', () => {
  it('returns 1 when no prior activity', () => {
    expect(computeStreak(0, null)).toBe(1)
    expect(computeStreak(5, null)).toBe(1)
  })

  it('increments streak when gap < 48 hours', () => {
    const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    expect(computeStreak(3, twentyHoursAgo)).toBe(4)
  })

  it('increments streak when gap is very short (< 1 hour)', () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    expect(computeStreak(10, thirtyMinsAgo)).toBe(11)
  })

  it('resets streak to 1 when gap >= 48 hours', () => {
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    expect(computeStreak(7, threeDaysAgo)).toBe(1)
  })

  it('resets streak to 1 when gap is exactly 48 hours', () => {
    const exactlyFortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    expect(computeStreak(3, exactlyFortyEightHoursAgo)).toBe(1)
  })

  it('resets streak to 1 when gap is just over 48 hours', () => {
    const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString()
    expect(computeStreak(5, fortyNineHoursAgo)).toBe(1)
  })

  it('handles future dates gracefully (gap < 0 still < 48h)', () => {
    const tenSecondsFromNow = new Date(Date.now() + 10_000).toISOString()
    // Negative gap is < 48 hours, so streak should increment
    const result = computeStreak(2, tenSecondsFromNow)
    expect(result).toBe(3)
  })
})

// ─── buildTutorSystemPrompt ───────────────────────────────────────────────────

describe('buildTutorSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(100)
  })

  it('includes the lesson title', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('The Five Pillars of Islam')
  })

  it('includes the lesson objective', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('The student can name and briefly describe all five pillars')
  })

  it('includes the student level', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('beginner')
  })

  it('includes advanced level when session is advanced', () => {
    const advancedSession = { ...baseSession, level: 'advanced' as const }
    const prompt = buildTutorSystemPrompt(advancedSession, baseLesson)
    expect(prompt).toContain('advanced')
  })

  it('includes mastery context when scores present', () => {
    const sessionWithScores: CiTutorSession = {
      ...baseSession,
      mastery_scores: { 'abc123': 75, 'def456': 90 },
    }
    const prompt = buildTutorSystemPrompt(sessionWithScores, baseLesson)
    expect(prompt).toContain('%')
  })

  it('shows "no prior mastery data" when scores are empty', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('no prior mastery data')
  })

  it('includes lesson-specific guidance from system_prompt_addendum', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('Focus on practical understanding')
  })

  it('includes security instruction to prevent prompt injection', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    const lower = prompt.toLowerCase()
    expect(lower).toContain('security')
    expect(lower).toContain('ignore any instructions')
  })

  it('instructs tutor to ask questions that test the objective', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt).toContain('tests the objective')
  })

  it('includes scholar escalation disclaimer', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    expect(prompt.toLowerCase()).toContain('scholar')
  })

  it('does not contain prompt injection vectors', () => {
    const prompt = buildTutorSystemPrompt(baseSession, baseLesson)
    const lower = prompt.toLowerCase()
    expect(lower).not.toContain('ignore previous')
    expect(lower).not.toContain('jailbreak')
    expect(lower).not.toContain('system:')
  })
})
