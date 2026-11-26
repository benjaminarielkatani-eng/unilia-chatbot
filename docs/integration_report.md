# Integration Report — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26  
**Branch:** `final-integration`  
**Sprint:** 8

---

## 1. System Architecture Overview

```
Browser (frontend/)
    │
    ├── index.html / script.js      ← Landing page, redirects to chat.html
    ├── chat.html / chat.js         ← Student chat interface
    └── admin.html / admin.js       ← Admin dashboard
            │
            │  HTTP (same origin, port 8000)
            ▼
FastAPI Backend (backend/)
    ├── routers/auth.py             ← POST /api/auth/login, GET /api/auth/me
    ├── routers/chat.py             ← POST /api/chat/ask, GET /api/chat/sessions/{token}
    ├── routers/feedback.py         ← POST /api/chat/feedback
    ├── routers/documents.py        ← GET/POST /api/documents/, GET/PUT/DELETE /api/documents/{id}
    ├── routers/admin.py            ← GET /api/admin/analytics, users, feedback
    ├── services/ai_service.py      ← Calls local document_engine (AI_ENGINE_URL blank)
    └── services/document_engine.py ← Keyword-based passage search over uploaded files
            │
            ▼
    SQLite (unilia.db)
    ├── users           ← Admin accounts
    ├── documents       ← Document metadata
    ├── chat_sessions   ← Conversation sessions (by token)
    ├── messages        ← Questions + answers
    ├── feedback        ← Student ratings
    └── feedback_reviews ← Admin review markers
            │
    uploads/            ← Physical uploaded files (PDF, DOCX, TXT)
```

---

## 2. Team Deliverables Mapping

### Benjamin (Backend)
| Deliverable | File | Status |
|---|---|---|
| FastAPI application | `backend/main.py` | ✅ |
| Database models & tables | `backend/models/` | ✅ All 6 tables |
| Authentication (JWT, RBAC) | `backend/routers/auth.py`, `backend/services/auth_service.py` | ✅ |
| Document CRUD | `backend/routers/documents.py` | ✅ |
| Chat endpoints | `backend/routers/chat.py` | ✅ |
| Feedback storage | `backend/routers/feedback.py` | ✅ |
| Admin analytics | `backend/routers/admin.py` | ✅ |
| CORS middleware | `backend/main.py` | ✅ |

### Christopher (Frontend)
| Deliverable | File | Status |
|---|---|---|
| Student chat UI | `frontend/chat.html`, `frontend/chat.js` | ✅ |
| Session history | `frontend/chat-storage.js`, `frontend/chat.js` | ✅ |
| Source references display | `frontend/chat.js` (`readSources`, `createAIMessage`) | ✅ |
| Feedback UI (Helpful/Not helpful) | `frontend/chat.js` (`submitFeedback`) | ✅ |
| Admin dashboard | `frontend/admin.html`, `frontend/admin.js` | ✅ |
| Document management UI | `frontend/admin.js` (`renderDocuments`, `showDocumentForm`) | ✅ |
| Analytics dashboard | `frontend/admin.js` (`renderAnalytics`, `renderChart`) | ✅ |
| Responsive design | `frontend/style.css`, `frontend/admin.css` | ✅ |

### Bridjet (Knowledge Base / Documents)
| Deliverable | File | Status |
|---|---|---|
| Document upload | `backend/routers/documents.py` | ✅ (via Benjamin's backend) |
| Text extraction | `backend/services/document_engine.py` | ✅ (PDF, DOCX, TXT) |
| Vector DB sync | — | ⚠️ Not implemented — using local keyword search |
| Metadata management | `backend/models/document.py`, DB | ✅ |

### Macmillan (AI/NLP/RAG)
| Deliverable | File | Status |
|---|---|---|
| Chroma vector DB | — | ❌ Missing |
| Semantic embeddings | — | ❌ Missing |
| LLM integration | — | ❌ Missing |
| RAG pipeline | — | ❌ Missing |
| Fallback answer | `backend/services/document_engine.py` | ✅ (local keyword engine used instead) |

---

## 3. Integration Fixes Applied (Sprint 8)

| # | Problem | File Changed | Fix |
|---|---|---|---|
| 1 | Admin login HTTP 422 — `admin.js` sent JSON but backend requires `OAuth2PasswordRequestForm` (form-encoded) | `frontend/admin.js` lines 157–163 | Changed `Content-Type: application/json` → `application/x-www-form-urlencoded`, switched `JSON.stringify` to `URLSearchParams` |
| 2 | `AI_ENGINE_URL=http://localhost:8001` caused `ConnectError` on every chat request | `backend/.env` | Set `AI_ENGINE_URL=` (blank) → backend uses local document engine directly |

---

## 4. Interface Contract Verification

### Chat API — MATCHED ✅
| Endpoint | Frontend Call | Backend Handler | Verdict |
|---|---|---|---|
| `POST /api/chat/ask` | `chat.js:609` — JSON `{question, session_token}` | `routers/chat.py` `QuestionRequest` | ✅ |
| `GET /api/chat/sessions/{token}` | `chat.js:733` | `routers/chat.py` `SessionHistoryResponse` | ✅ |
| `POST /api/chat/feedback` | `chat.js:759` — JSON `{session_token, message_id, rating}` | `routers/feedback.py` `FeedbackRequest` | ✅ |

### Admin API — MATCHED ✅ (after fix #1)
| Endpoint | Frontend Call | Backend Handler | Verdict |
|---|---|---|---|
| `POST /api/auth/login` | `admin.js:157` — form-encoded | `routers/auth.py` `OAuth2PasswordRequestForm` | ✅ (fixed) |
| `GET /api/auth/me` | `admin.js:135` — Bearer | `routers/auth.py` | ✅ |
| `GET /api/admin/analytics?days=N` | `admin.js:222` | `routers/admin.py` | ✅ |
| `GET /api/admin/feedback` | `admin.js:233` | `routers/admin.py` | ✅ |
| `PATCH /api/admin/feedback/{id}` | `admin.js:905` — `{reviewed: bool}` | `routers/admin.py` `ReviewRequest` | ✅ |
| `GET /api/admin/users` | `admin.js:233` | `routers/admin.py` | ✅ |
| `POST /api/admin/users` | `admin.js:266` — JSON | `routers/admin.py` `UserCreate` | ✅ |
| `PATCH /api/admin/users/{id}` | `admin.js:266` — JSON | `routers/admin.py` `UserUpdate` | ✅ |
| `GET /api/documents/` | `admin.js:293` | `routers/documents.py` | ✅ |
| `POST /api/documents/` | `admin.js:786` — multipart | `routers/documents.py` | ✅ |
| `PUT /api/documents/{id}` | `admin.js:806` — JSON | `routers/documents.py` | ✅ |
| `DELETE /api/documents/{id}` | `admin.js:766` | `routers/documents.py` | ✅ |

---

## 5. Known Limitations

1. **No LLM/semantic search** — Macmillan's RAG engine was not delivered. The system uses `document_engine.py` which performs keyword matching, not semantic understanding. Answers are direct passage quotes, not synthesized LLM responses.
2. **SQLite in production** — Suitable for demo/local. Would need PostgreSQL for concurrent production use.
3. **No HTTPS** — Running on plain HTTP locally. TLS required for production deployment.
4. **Session history client-side only** — Conversation history is stored in browser `localStorage`. Clearing browser data loses history.
