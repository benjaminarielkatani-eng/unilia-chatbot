# QA Summary — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26  
**Branch:** `final-integration`  
**Sprint:** 9

---

## Executive Summary

The UNILIA AI Helpdesk Chatbot has been fully integrated, tested, and verified. All 41 test cases pass. One critical defect (admin login broken) was found and fixed. The system is ready for demo.

---

## Defects Found During Testing

| ID | Severity | Description | File | Fix Applied |
|---|---|---|---|---|
| D-001 | **Critical** | Admin login returned HTTP 422 — `admin.js` sent JSON body but backend requires `application/x-www-form-urlencoded` (OAuth2PasswordRequestForm) | `frontend/admin.js` | ✅ Fixed: switched to `URLSearchParams`, form-encoded |
| D-002 | Minor | `AI_ENGINE_URL=http://localhost:8001` caused `ConnectError` logged on every chat question before auto-fallback | `backend/.env` | ✅ Fixed: set `AI_ENGINE_URL=` (blank) |

**No other defects found.**

---

## Test Results Summary

| Test Area | Cases | Passed | Failed | Notes |
|---|---|---|---|---|
| Authentication & RBAC | 7 | 7 | 0 | Login, token validation, role enforcement all work |
| Chat Q&A | 10 | 10 | 0 | 8/8 questions answered from uploaded document |
| Document Management | 7 | 7 | 0 | Upload, update, delete, list all work |
| Feedback System | 6 | 6 | 0 | Submit, admin review, reopen all work |
| Admin Dashboard | 5 | 5 | 0 | Analytics, users, charts all load correctly |
| Non-Functional | 6 | 6 | 0 | Response times < 1s, CORS OK, mobile layout OK |
| **TOTAL** | **41** | **41** | **0** | |

---

## AI Quality Summary

| Metric | Result |
|---|---|
| Answer accuracy (questions in document) | 100% (8/8) |
| Correct fallback (out-of-scope questions) | 100% (2/2) |
| Hallucinations | None — engine quotes document verbatim |
| Average chat response time | ~0.8 seconds |
| Source references accuracy | 100% |

---

## Security Assessment

| Check | Result |
|---|---|
| Admin routes require valid JWT | ✅ Returns 401 without token |
| Expired/fake tokens rejected | ✅ Returns 401 |
| Non-admin token blocked | ✅ Returns 403 |
| Passwords never stored in plaintext | ✅ bcrypt hashed |
| Secrets not committed to Git | ✅ `.env` in `.gitignore` |
| File upload restricted to safe types | ✅ `.pdf`, `.docx`, `.doc`, `.txt` only |

---

## Known Issues & Risks

| Issue | Risk Level | Mitigation |
|---|---|---|
| Macmillan's RAG/LLM engine not delivered | Medium | Using local keyword engine — answers are accurate but not AI-generated |
| SQLite database (not PostgreSQL) | Low for demo | Suitable for demo; migrate to PostgreSQL for production |
| No HTTPS | Medium for production | Configure reverse proxy (nginx + SSL) for real deployment |
| Browser localStorage for session history | Low | Clearing browser data loses history; acceptable for demo |
| Admin `unilia2024` password is default | Medium for production | Change immediately after handover |

---

## Sign-off

- Sprint 8 Integration: ✅ Complete
- Sprint 9 Testing: ✅ Complete
- All critical defects fixed: ✅ Yes
- Demo milestone verified: ✅ Student question → document-grounded answer
- Ready for Sprint 10 delivery: ✅ Yes
