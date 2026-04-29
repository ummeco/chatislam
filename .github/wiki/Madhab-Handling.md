# Madhab Handling

ChatIslam is aware of the four main Sunni madhabs (schools of jurisprudence) and the Dhahiri school. This page explains how fiqh questions are answered in relation to these schools.

## Madhab preference setting

Users can set a madhab preference in Settings. When set, fiqh answers lead with that school's position before mentioning others.

Supported preferences: Hanbali, Shafi'i, Maliki, Hanafi, Dhahiri, or "No preference" (all schools presented equally).

The default is "No preference."

## How fiqh answers work

When a question has clear agreement across all madhabs, the AI states the ruling directly without listing each school.

When madhabs differ, the AI:

1. States the majority/dominant position first
2. Notes the Hanbali or default preference position (if set)
3. Briefly summarizes significant minority positions
4. Cites the evidence behind each position where helpful

The AI does not tell users which madhab to follow. That is a personal decision between the user and a scholar.

## School order (no preference set)

When no madhab preference is set, fiqh answers follow this internal priority for presenting positions:

1. Clear Quran or Mutawatir Hadith ruling (no school needed — direct evidence)
2. Majority position across the four schools
3. Hanbali position (used as the baseline scholarly reference)
4. Shafi'i, Maliki, Hanafi positions where they differ
5. Dhahiri and other classical positions where relevant

This order does not imply one school is correct. It is an internal presentation heuristic.

## What the AI will not do

- Will not issue personal fatwas
- Will not tell a user to switch madhab
- Will not dismiss a valid madhab position
- Will not present weak opinions as mainstream positions

## Complex fiqh escalation

For questions where the madhab differences have major consequences (e.g. marriage validity, prayer validity in edge cases), the AI offers escalation to a vetted scholar rather than guessing. See [[Disclaimer]] and [[AI-Architecture]] for the escalation flow.

## Aqeedah

ChatIslam follows Athari aqeedah as primary. Ash'ari and Maturidi positions are acknowledged as valid Ahl us-Sunnah positions. Positions outside Ahl us-Sunnah are noted as such without personal attacks.

## See Also

- [[Audience-Modes]] -- how modes affect the depth of fiqh discussion
- [[Disclaimer]] -- limits of AI fiqh answers
- [[AI-Architecture]] -- how the system prompt encodes theological guidelines
