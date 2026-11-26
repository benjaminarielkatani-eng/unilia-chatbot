# Test Plan and Cases — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26  
**Branch:** `final-integration`

---

## Test Environment
- **Backend:** FastAPI + SQLite, `http://localhost:8000`
- **Frontend:** Served by FastAPI (same origin)
- **Admin credentials:** username=`admin`, password=`unilia2024`
- **Test document:** `UNILIA Student Information Guide` (uploaded via API, ID=2)

---

## Test Suite 1: Authentication & Access Control

| TC# | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-01 | Admin login — valid credentials | POST `/api/auth/login` with `username=admin&password=unilia2024` (form-encoded) | HTTP 200, returns `{access_token, token_type: "bearer"}` | HTTP 200, token returned | ✅ PASS |
| TC-02 | Admin login — wrong password | POST `/api/auth/login` with wrong password | HTTP 401 Unauthorized | HTTP 401 | ✅ PASS |
| TC-03 | Admin login — wrong username | POST `/api/auth/login` with wrong username | HTTP 401 Unauthorized | HTTP 401 | ✅ PASS |
| TC-04 | Get current user profile | GET `/api/auth/me` with valid Bearer token | HTTP 200, returns `{id, username, role, is_active}` | HTTP 200, correct profile | ✅ PASS |
| TC-05 | Access admin route — no token | GET `/api/admin/analytics` without Authorization header | HTTP 401 Unauthorized | HTTP 401 | ✅ PASS |
| TC-06 | Access admin route — invalid token | GET `/api/admin/analytics` with fake Bearer token | HTTP 401 Unauthorized | HTTP 401 | ✅ PASS |
| TC-07 | Admin dashboard browser login | Open `/admin.html`, enter credentials, click Sign In | Dashboard loads with analytics overview | Form-encoded fix applied, login works | ✅ PASS |

---

## Test Suite 2: Chat Q&A

| TC# | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-08 | Ask question — document exists | POST `/api/chat/ask` with `{question: "What are admission requirements?"}` | HTTP 201, `is_answered: true`, answer quotes document | ✅ Answered with Section 1 content | ✅ PASS |
| TC-09 | Ask question — fees | POST `/api/chat/ask` with `{question: "How much are tuition fees?"}` | `is_answered: true`, MK 850,000 mentioned | ✅ Correct fee information returned | ✅ PASS |
| TC-10 | Ask question — campuses | POST `/api/chat/ask` with `{question: "What campuses does UNILIA have?"}` | `is_answered: true`, campuses listed | ✅ All 4 campuses returned | ✅ PASS |
| TC-11 | Ask question — library hours | POST `/api/chat/ask` with `{question: "What time does the library close?"}` | `is_answered: true`, 10 PM weekdays | ✅ Correct hours returned | ✅ PASS |
| TC-12 | Ask question — late registration fee | POST `/api/chat/ask` with `{question: "What is the late registration fee?"}` | `is_answered: true`, MK 5,000 mentioned | ✅ Correct fee returned | ✅ PASS |
| TC-13 | Ask question — no matching info | POST `/api/chat/ask` with `{question: "Tell me about the weather in Mzuzu"}` | `is_answered: false`, fallback message shown | Fallback message returned | ✅ PASS |
| TC-14 | Session continuity | Ask first question, receive `session_token`, ask second question with same token | Both in same session | Session token reused correctly | ✅ PASS |
| TC-15 | Blank question rejected | POST `/api/chat/ask` with `{question: "   "}` | HTTP 422 validation error | HTTP 422 | ✅ PASS |
| TC-16 | Session history retrieval | GET `/api/chat/sessions/{session_token}` | Returns all messages in that session | Messages returned correctly | ✅ PASS |
| TC-17 | Session not found | GET `/api/chat/sessions/fake-token-123` | HTTP 404 | HTTP 404 | ✅ PASS |

---

## Test Suite 3: Document Management

| TC# | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-18 | Upload document — valid TXT | POST `/api/documents/` multipart with admin token + `.txt` file | HTTP 201, document record created | ✅ ID=2 created | ✅ PASS |
| TC-19 | Upload document — invalid type | POST `/api/documents/` with `.exe` file | HTTP 400, type not allowed | HTTP 400 | ✅ PASS |
| TC-20 | Upload document — no auth | POST `/api/documents/` without token | HTTP 401 or 403 | HTTP 403 | ✅ PASS |
| TC-21 | List documents | GET `/api/documents/` | Returns array of active documents | Returns list with correct metadata | ✅ PASS |
| TC-22 | Update document metadata | PUT `/api/documents/{id}` with `{title, category}` and admin token | HTTP 200, updated record returned | ✅ Updated | ✅ PASS |
| TC-23 | Delete document (soft) | DELETE `/api/documents/{id}` with admin token | HTTP 200, document no longer in list | ✅ Soft-deleted, hidden from list | ✅ PASS |
| TC-24 | Deleted doc not in search | After TC-23, GET `/api/documents/` | Deleted doc absent from list | ✅ Absent | ✅ PASS |

---

## Test Suite 4: Feedback

| TC# | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-25 | Submit helpful rating | POST `/api/chat/feedback` with `{session_token, message_id, rating: 5}` | HTTP 200, feedback record created | ✅ ID=1 created | ✅ PASS |
| TC-26 | Submit not-helpful rating | POST `/api/chat/feedback` with `{rating: 1}` | HTTP 200, feedback record | ✅ Recorded | ✅ PASS |
| TC-27 | Invalid message_id | POST `/api/chat/feedback` with wrong message_id | HTTP 404 | HTTP 404 | ✅ PASS |
| TC-28 | Admin views feedback list | GET `/api/admin/feedback` with admin token | Returns array of feedback with question, rating, comment | ✅ Returns correctly | ✅ PASS |
| TC-29 | Admin marks feedback reviewed | PATCH `/api/admin/feedback/{id}` with `{reviewed: true}` | Feedback gains `reviewed_at` timestamp | ✅ Timestamp set | ✅ PASS |
| TC-30 | Admin reopens feedback | PATCH `/api/admin/feedback/{id}` with `{reviewed: false}` | `reviewed_at` cleared | ✅ Cleared | ✅ PASS |

---

## Test Suite 5: Admin Dashboard & Analytics

| TC# | Test Case | Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| TC-31 | Analytics totals | GET `/api/admin/analytics?days=7` | Returns `{totals, daily, top_questions, recent_activity}` | ✅ Correct shape | ✅ PASS |
| TC-32 | Analytics after questions | Ask 8 questions then check analytics | `totals.questions >= 8` | ✅ Question count accurate | ✅ PASS |
| TC-33 | User management list | GET `/api/admin/users` | Returns user array | ✅ Returns admin user | ✅ PASS |
| TC-34 | Create new staff user | POST `/api/admin/users` with `{username, email, password, role: "staff"}` | HTTP 201, user created | ✅ Created | ✅ PASS |
| TC-35 | Analytics period filter | GET `/api/admin/analytics?days=30` | Returns 30 days of data | ✅ Correct date range | ✅ PASS |

---

## Test Suite 6: Non-Functional Tests

| TC# | Test | Method | Expected | Result | Status |
|---|---|---|---|---|---|
| TC-36 | Response time — chat | Measure time for POST `/api/chat/ask` | < 3 seconds | ~0.8s average | ✅ PASS |
| TC-37 | Response time — analytics | Measure GET `/api/admin/analytics` | < 1 second | ~0.1s | ✅ PASS |
| TC-38 | CORS — different origin allowed | Verify `Access-Control-Allow-Origin` header present | Header present for all routes | ✅ Configured in `main.py` | ✅ PASS |
| TC-39 | Frontend loads | Open `http://localhost:8000` in browser | Landing page renders | ✅ Loads correctly | ✅ PASS |
| TC-40 | Admin login form | Open `/admin.html`, login with credentials | Dashboard loads | ✅ Loads after fix #1 | ✅ PASS |
| TC-41 | Mobile layout | View chat.html at 375px viewport | Layout adapts, chat usable | ✅ Responsive CSS applied | ✅ PASS |

---

## Defects Found & Fixed

| Defect ID | Description | Severity | Fixed? |
|---|---|---|---|
| D-001 | Admin login HTTP 422 — JSON vs form-encoded mismatch | Critical | ✅ Fixed in `frontend/admin.js` |
| D-002 | `AI_ENGINE_URL` causing unnecessary ConnectError logs | Minor | ✅ Fixed in `.env` |

---

## Overall Test Result

| Suite | Tests | Passed | Failed |
|---|---|---|---|
| Auth & Access Control | 7 | 7 | 0 |
| Chat Q&A | 10 | 10 | 0 |
| Document Management | 7 | 7 | 0 |
| Feedback | 6 | 6 | 0 |
| Admin Dashboard | 5 | 5 | 0 |
| Non-Functional | 6 | 6 | 0 |
| **Total** | **41** | **41** | **0** |
