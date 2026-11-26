# Sprint 6 — Authentication & Role-Based Access Control

## Overview

Sprint 6 adds a full login system so only authorised administrators can
manage documents. Students continue to use the chatbot without any login.

---

## What Was Built

| File | What it does |
|---|---|
| `services/auth_service.py` | Password hashing (bcrypt) and JWT token creation/verification |
| `schemas/auth.py` | LoginRequest, TokenResponse, CurrentUser data shapes |
| `routers/auth.py` | POST /api/auth/login and GET /api/auth/me endpoints |
| `routers/documents.py` | Upload, update, delete endpoints now require admin login |
| `create_admin.py` | One-time script to create the first admin account |

---

## New Endpoints

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Submit username + password, receive JWT token |
| GET | `/api/auth/me` | Yes | Get profile of logged-in admin |

---

## How Login Works

```
1. Admin POSTs to /api/auth/login with their username and password
2. Backend verifies the password against the stored bcrypt hash
3. If correct, backend returns a JWT token (valid for 8 hours)
4. Admin includes token in all future requests:
   Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
5. Protected endpoints verify the token automatically
6. If token is missing, invalid or expired → HTTP 401 Unauthorized
```

---

## Protected Endpoints (Require Admin Login)

| Method | Endpoint | Why protected |
|---|---|---|
| POST | `/api/documents/` | Only admins can upload documents |
| PUT | `/api/documents/{id}` | Only admins can update document details |
| DELETE | `/api/documents/{id}` | Only admins can remove documents |

**Public endpoints (no login needed):**
- GET `/api/documents/` — anyone can list documents
- GET `/api/documents/{id}` — anyone can view a document
- POST `/api/chat/ask` — students ask questions freely
- GET `/api/chat/sessions/{token}` — students view their chat history

---

## Security Design Decisions

| Decision | Reason |
|---|---|
| bcrypt password hashing | Industry standard — cannot be reversed, slow to brute-force |
| JWT tokens (not sessions) | Stateless — backend doesn't need to store session data |
| 8-hour token expiry | Balance between convenience and security |
| Same error for wrong username/password | Prevents attackers from knowing if a username exists |
| Soft delete on documents | Allows recovery if deleted by mistake |

---

## First Admin Account

Run `create_admin.py` to create the account and enter a password at the terminal.

- **Username:** admin
- **Email:** admin@unilia.ac.mw

---

## For Isaac (Testing)

Test these scenarios:

1. **Login with correct credentials** → should return a token
2. **Login with wrong password** → should return HTTP 401
3. **Upload a document without a token** → should return HTTP 401
4. **Upload a document with a valid token** → should return HTTP 201
5. **Try an expired token** → should return HTTP 401
6. **GET /api/auth/me with a valid token** → should return admin profile

---

*Sprint 6 — UNILIA AI Helpdesk Chatbot — Backend Team (Benjamin Katani)*
