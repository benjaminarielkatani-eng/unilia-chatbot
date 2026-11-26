# AI Evaluation Report — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26  
**Branch:** `final-integration`

---

## 1. AI Engine Overview

**Engine Used:** Local keyword-based document search (`backend/services/document_engine.py`)  
**Expected Engine:** Macmillan's RAG pipeline (Chroma + embeddings + LLM) — **not delivered**  

The system uses `document_engine.py` as a fallback, which:
- Reads uploaded documents (PDF, DOCX, TXT) and splits them into passages
- Scores passages against the question using keyword/term matching and relevance scoring
- Returns the top-scoring passage as the answer, with the source document title as a reference
- If no passage meets the minimum relevance threshold, returns a fallback message

> [!NOTE]
> This is a **keyword/retrieval-only** engine. It is NOT an LLM and does NOT generate new language. It quotes document passages verbatim. This is acceptable for the demo but should be replaced with a proper RAG+LLM pipeline in production.

---

## 2. Test Document

**Title:** UNILIA Student Information Guide  
**Type:** TXT  
**Content:** Covers admissions, fees, campuses, academic calendar, support services, contact information  
**Uploaded:** 2026-11-26 via `POST /api/documents/`

---

## 3. Question Accuracy Test

8 questions were asked in various phrasings. Results:

| # | Question | Expected Topic | is_answered | Answer Grounded? | Hallucination? |
|---|---|---|---|---|---|
| 1 | What are the admission requirements at UNILIA? | MSCE credits, entry requirements | ✅ True | ✅ Direct quote from Section 1 | ❌ None |
| 2 | How much are the tuition fees? | MK 850,000 undergrad, MK 1.2M postgrad | ✅ True | ✅ Direct quote from Section 2 | ❌ None |
| 3 | What campuses does UNILIA have? | Ekwendeni, Livingstonia, Mzuzu, Zomba | ✅ True | ✅ Direct quote from Section 5 | ❌ None |
| 4 | How can I contact the registrar? | registrar@unilia.ac.mw | ✅ True | ✅ Direct quote from Section 6 | ❌ None |
| 5 | Tell me about financial assistance and bursaries | Bursaries, HESLGB loans | ✅ True | ✅ Direct quote from Section 2 | ❌ None |
| 6 | What time does the library close? | 10 PM weekdays, 5 PM weekends | ✅ True | ✅ Direct quote from Section 4 | ❌ None |
| 7 | What is the late registration fee? | MK 5,000 | ✅ True | ✅ Direct quote from Section 3 | ❌ None |
| 8 | How many books can I borrow from the library? | 5 books | ✅ True | ✅ Direct quote from Section 4 | ❌ None |

**Accuracy: 8/8 (100%)** on questions whose answers are in the uploaded document.

---

## 4. Fallback Behaviour Test

Questions asked about topics NOT in the document:

| Question | Expected Behaviour | Actual Behaviour | Correct? |
|---|---|---|---|
| "Tell me about the weather in Mzuzu" | Fallback message, `is_answered: false` | Returned fallback message | ✅ |
| "What is the UNILIA mascot?" | Fallback message, `is_answered: false` | Returned fallback message | ✅ |

Fallback message returned: *"I couldn't find a matching answer in the university documents. Try naming the programme, campus, or policy you are asking about."*

---

## 5. Source Reference Verification

The engine sets `source_documents` to the document title when a passage is found. The frontend `chat.js` reads this and displays it in a "Sources" box beneath the AI response.

- Sources displayed match the document that was searched ✅
- No fabricated source titles ✅

---

## 6. Same-Question Paraphrase Test

The same question asked in 3 different ways:

| Phrasing | Answered? |
|---|---|
| "What are the admission requirements at UNILIA?" | ✅ Yes |
| "How do I get admitted to UNILIA?" | ✅ Yes (matches on "admitted", "UNILIA") |
| "What do I need to study at UNILIA?" | ⚠️ Partial — matched on "UNILIA" keywords but less specific passage |

> [!TIP]
> The keyword engine works best with specific nouns (fees, library, campus, admission). Vague phrasings may get lower-relevance passage matches.

---

## 7. Hallucination Assessment

**Result: NO hallucinations detected.**

Because the engine quotes document passages verbatim rather than generating new text, there is zero risk of LLM-style hallucination. All answers are direct excerpts from the uploaded `UNILIA Student Information Guide`.

---

## 8. Answer Coverage Summary

| Metric | Value |
|---|---|
| Questions answered correctly | 8/8 (100%) |
| Questions correctly falling back | 2/2 (100%) |
| Hallucinations detected | 0 |
| Source references correct | 8/8 (100%) |
| Average response time | ~0.8 seconds |

---

## 9. Limitations and Recommendations

| Limitation | Impact | Recommendation |
|---|---|---|
| Keyword matching only — no semantic understanding | Paraphrased questions may miss relevant passages | Replace with Macmillan's RAG+LLM pipeline when available |
| Passage is returned verbatim — no synthesis | Long or complex answers may be hard to read | Add LLM for answer synthesis |
| Answer quality depends entirely on document content | If document is incomplete, students get fallback | Keep documents updated and comprehensive |
| No conversation context | Each question is answered independently | LLM with conversation history would improve multi-turn Q&A |
