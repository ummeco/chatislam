# Privacy Policy — ChatIslam

**Extends:** `../../ummat/legal/_shared/privacy-policy-base.md`
**Effective date:** 2026-05-01
**Last reviewed:** 2026-04-26
**Version:** 1.0.0

> TEMPLATE — Awaiting legal review per Sprint 25 T1-25-10b. Do not publish until reviewed.

---

## Template Variable Overrides

| Variable | Value |
|---|---|
| `{{PRODUCT_NAME}}` | ChatIslam |
| `{{PRODUCT_DOMAIN}}` | chatislam.org |
| `{{ENTITY_NAME}}` | Ummeco LLC |
| `{{CONTACT_EMAIL}}` | privacy@chatislam.org |
| `{{MAILING_ADDRESS}}` | [Registered address — to be added before publication] |
| `{{EFFECTIVE_DATE}}` | May 1, 2026 |
| `{{COPPA_APPLIES}}` | false |

---

## Privacy Policy

**Effective date:** May 1, 2026
**Last reviewed:** 2026-04-26
**Version:** 1.0.0

This policy applies to ChatIslam at chatislam.org, operated by Ummeco LLC. ChatIslam is an
AI-powered Islamic Q&A and dawah tool. Because it uses an AI provider to generate responses,
this policy includes specific disclosures about that processing.

Questions? Email privacy@chatislam.org.

---

### 1. Who We Are

Ummeco LLC operates ChatIslam at chatislam.org, an AI-assisted Islamic Q&A service.

**Privacy contact:** privacy@chatislam.org
**GDPR data subject requests:** dpa@ummat.dev

---

### 2. AI Processing via Anthropic (ChatIslam-Specific)

ChatIslam routes your typed questions to Anthropic's Claude AI to generate responses. This is
a critical disclosure.

**What we send to Anthropic:** The text of your typed question. Nothing else. Specifically,
we never send your email address, account ID, full name, or any other PII field to Anthropic.
This is enforced at the API wrapper layer — any prompt matching a PII pattern (email, phone,
SSN format) is rejected before leaving our infrastructure.

**What Anthropic does with it:** Anthropic processes your prompt to generate a response and
returns it to us. Anthropic's standard API tier does not train on customer inputs. Anthropic
applies its own security and retention policies to API traffic. For details, see:
https://www.anthropic.com/legal and our internal compliance record
(`.github/docs/compliance/anthropic-dpa-memo.md`).

**Retention of conversations on our side:** We store your conversation history on our servers
for **30 days**, after which conversations are anonymized (content retained without link to
your account) and eventually deleted. You can delete individual conversations or your full
history at any time in account settings.

**AI spend cap:** We apply a platform-level Anthropic API spend cap (Sprint B11 control
TB11-05) to prevent runaway billing and limit the volume of data processed through Anthropic.

**Anthropic sub-processor disclosure:** Anthropic is listed as a sub-processor in Section 4
of the base policy. We are working toward a signed standard DPA with Anthropic; current status
is published at chatislam.org/legal/sub-processors.

**Sharia compliance disclaimer:** ChatIslam provides AI-generated responses for educational
and informational purposes. Responses do not constitute a legal fatwa and should not be relied
upon as religious authority. For authoritative religious guidance, consult a qualified Islamic
scholar.

---

### 3. Content You Submit (ChatIslam-Specific)

ChatIslam collects:

- The text of questions you type into the chat interface
- Conversation history (stored 30 days, then anonymized; see above)
- Optional feedback ratings you give to AI responses (thumbs up/down, free-text)
- Account profile (email, optional display name)

Feedback ratings and free-text feedback may be used to improve response quality. They are
reviewed by the Ummeco team and are not shared with Anthropic.

---

### 4. Children's Privacy

ChatIslam is intended for users aged 13 and older (16 in the EU and UK). We do not knowingly
collect personal data from children under 13. If you believe a child has provided data without
parental consent, contact privacy@chatislam.org and we will delete it promptly.

---

### 5. Data Retention (ChatIslam Additions)

| Data class | Retention | Reason |
|---|---|---|
| Conversation history (linked to account) | 30 days, then anonymized | AI quality, user convenience |
| Anonymized conversation content | 12 months after anonymization | Aggregate analysis |
| Feedback ratings | Until account deleted | Quality improvement |
| Free-text feedback | 12 months, then deleted | Quality improvement |

---

### 6. Contact

**Privacy inquiries:** privacy@chatislam.org
**GDPR data requests:** dpa@ummat.dev
**Security:** chatislam.org/.well-known/security.txt
**Abuse reports:** abuse@ummat.dev

Ummeco LLC
[Registered address — to be added before publication]

---

*TEMPLATE — Awaiting legal review per Sprint 25 T1-25-10b. Do not publish until reviewed.*
