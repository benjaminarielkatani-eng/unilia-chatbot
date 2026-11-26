# Deployment Verification — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26  
**Branch:** `final-integration`

---

## 1. Environment Verified

| Component | Status | Detail |
|---|---|---|
| Python 3.12 | ✅ | `py -3.12` available |
| Virtual environment | ✅ | `backend/venv/` using Python 3.12 |
| All Python packages | ✅ | fastapi, uvicorn, sqlalchemy, passlib, python-jose, httpx, pypdf, python-multipart, python-dotenv |
| `.env` file | ✅ | All required vars set |
| SQLite database | ✅ | `backend/unilia.db` with 6 tables |
| Admin account | ✅ | username=`admin`, password=`unilia2024` |
| uploads/ folder | ✅ | Exists, writable |

---

## 2. Environment Variables Required

| Variable | Value | Required |
|---|---|---|
| `APP_NAME` | `UNILIA AI Helpdesk` | Optional (display only) |
| `DEBUG` | `True` | Optional |
| `DATABASE_URL` | `sqlite:///./unilia.db` | ✅ Required |
| `AI_ENGINE_URL` | `` (blank) | Required blank for local engine |
| `SECRET_KEY` | (64-char hex string) | ✅ Required — keep private |
| `JWT_ALGORITHM` | `HS256` | ✅ Required |
| `JWT_EXPIRE_MINUTES` | `480` | ✅ Required |

---

## 3. Startup Verification Checklist

Run these commands in order:

```powershell
# 1. Navigate to backend
cd c:\Users\Benjamin Katani\unilia-chatbot\backend

# 2. Activate virtual environment
.\venv\Scripts\activate

# 3. Start the server
uvicorn main:app --reload
```

Confirm you see in the terminal:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

Then verify in a browser or PowerShell:

```powershell
# Health check
Invoke-RestMethod http://localhost:8000/api/health
# Expected: { "status": "ok", "message": "UNILIA Helpdesk API is running" }

# Admin login
Invoke-RestMethod http://localhost:8000/api/auth/login -Method POST `
  -Body "username=admin&password=unilia2024" `
  -ContentType "application/x-www-form-urlencoded"
# Expected: { "access_token": "...", "token_type": "bearer" }
```

---

## 4. Features Verified Working

| Feature | Verified Via | Result |
|---|---|---|
| Health endpoint | `GET /api/health` | ✅ Returns `ok` |
| Admin login (browser) | `POST /api/auth/login` form-encoded | ✅ Returns JWT token |
| Admin profile | `GET /api/auth/me` | ✅ Returns admin profile |
| Student chat Q&A | `POST /api/chat/ask` | ✅ Answers from uploaded document |
| Session continuity | `GET /api/chat/sessions/{token}` | ✅ History returned |
| Feedback submission | `POST /api/chat/feedback` | ✅ Stored and retrievable |
| Admin analytics | `GET /api/admin/analytics` | ✅ Returns totals + daily + top questions |
| Admin feedback review | `PATCH /api/admin/feedback/{id}` | ✅ Review status toggles |
| Document upload | `POST /api/documents/` | ✅ File saved, DB record created |
| Document list | `GET /api/documents/` | ✅ Returns active documents |
| Document update | `PUT /api/documents/{id}` | ✅ Metadata updated |
| Document delete | `DELETE /api/documents/{id}` | ✅ Soft-deleted |
| Admin user management | `GET/POST/PATCH /api/admin/users` | ✅ CRUD works |
| Security enforcement | Unauthenticated admin requests | ✅ 401/403 returned |
| Frontend landing page | `http://localhost:8000` | ✅ Loads index.html |
| Frontend chat | `http://localhost:8000/chat.html` | ✅ Loads chat UI |
| Frontend admin | `http://localhost:8000/admin.html` | ✅ Loads admin login |

---

## 5. Database Connectivity

```powershell
# Confirm all 6 tables exist
cd c:\Users\Benjamin Katani\unilia-chatbot\backend
.\venv\Scripts\python.exe -c "
from database.database import engine
from sqlalchemy import inspect
tables = inspect(engine).get_table_names()
print('Tables:', tables)
"
# Expected: ['chat_sessions', 'documents', 'feedback', 'feedback_reviews', 'messages', 'users']
```

---

## 6. Known Non-Blocking Issues

- Macmillan's RAG/LLM engine not present — local keyword engine used instead (all features work)
- SQLite suitable for demo, not for concurrent production load
- No HTTPS — HTTP only on localhost
