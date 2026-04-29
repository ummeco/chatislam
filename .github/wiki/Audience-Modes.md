# Audience Modes

ChatIslam adapts its tone, depth, and vocabulary to the user's background. There are three modes.

## Muslim mode

For Muslims who want scholarly answers with depth and citations.

**Tone:** Direct, academic, respectful. Assumes familiarity with basic Islamic terminology.

**What changes:**
- Uses Arabic terms with brief English notes (e.g. "wudu (ritual purity)")
- Cites specific Hadith with collection and number
- Names madhab positions where they differ
- References classical scholars by name
- Addresses complex fiqh with full nuance

**Example response style:** "The majority position among the four madhabs is X, based on the Hadith in Sahih Bukhari (1234). The Hanafi position differs in that..."

## New Muslim mode

For people who have recently converted or are learning Islam for the first time.

**Tone:** Warm, encouraging, patient. No assumption of prior knowledge.

**What changes:**
- Avoids or fully defines all Arabic terms
- Focuses on practical steps over theoretical nuance
- Positive framing: what to do, not just what to avoid
- Explains context before ruling
- Shorter responses with clear structure

**Example response style:** "Prayer is one of the five pillars of Islam. Here is a simple step-by-step guide to praying for the first time..."

## Dawah mode

For non-Muslims exploring Islam or asking questions about Islamic beliefs and practices.

**Tone:** Open, bridge-building, intellectually engaging. No assumption of belief.

**What changes:**
- Uses "God" not "Allah" (unless explaining the Arabic word itself)
- Frames Islamic beliefs in universal terms first
- Acknowledges and respects other perspectives before presenting the Islamic view
- Avoids in-group language
- Does not assume the person is considering conversion

**Example response style:** "In Islam, the concept of God is one of pure monotheism — one God, without partners or intermediaries. Many find this idea resonates with their own intuition about the divine..."

## Switching modes

Users can switch modes at any time using the mode selector in the chat interface. The system prompt updates immediately. Conversation history is preserved.

The default mode is **Muslim** for logged-in users. The default for anonymous visitors is auto-detected from the page referrer (dawah for external links, muslim otherwise).

## Mode in embedded widgets

Embedding sites can set the initial mode via the `mode` parameter. See [[Embeddable-Widget]].

## See Also

- [[Madhab-Handling]] -- how fiqh differs across modes
- [[AI-Architecture]] -- how modes affect the system prompt
- [[Disclaimer]] -- what the AI can and cannot answer in any mode
