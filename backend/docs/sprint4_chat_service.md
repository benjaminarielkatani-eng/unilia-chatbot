# Sprint 4 — Student Question Backend Service

**Project:** UNILIA AI Helpdesk Chatbot
**Developer:** Benjamin Katani (ICT/01/13/23)
**Role:** Backend, Database and Security Developer
**Sprint:** 4

---

## Overview

Sprint 4 builds the backend service that receives student questions,
manages chat sessions, saves all messages to the database, and
communicates with the AI engine. A placeholder AI service is used
in Sprint 4 and will be replaced with the real RAG pipeline in Sprint 5.

---

## Architecture: Service Layer Pattern

A `services/` layer was introduced to separate the backend logic from
the AI engine. This means:

- The backend (routers, database) does not care HOW the AI works
- In Sprint 4, `ai_service.get_answer()` returns a placeholder
- In Sprint 5, only `services/ai_service.py` is updated — nothing else changes

```
Student Question
      ↓
POST /api/chat/ask   (router)
      ↓
get_or_create_session()   (session management)
      ↓
Save question to DB   (Message record)
      ↓
ai_service.get_answer()   (AI service layer)
      ↓                        ↓ Sprint 4: placeholder
Save answer to DB             ↓ Sprint 5: RAG pipeline call
      ↓
Return answer to student
```

---

## New Files

### `services/ai_service.py`
Contains the `AIService` class with a single `get_answer()` method.

**Sprint 4 behaviour:** Returns a fixed placeholder message.

**Sprint 5 update:** `get_answer()` will make an HTTP request to
Macmillan's RAG pipeline API and return a real, document-grounded answer.

---

## API Endpoints

### 1. Ask a Question (Main Chatbot Endpoint)
```
POST /api/chat/ask
Content-Type: application/json
```

**Request body:**
```json
{
  "question": "What are the course registration deadlines?",
  "session_token": "optional-existing-session-token"
}
```

**What happens internally:**
1. If `session_token` is provided and found → continue that session
2. If not → create a new session with a new token
3. Save the question to the `messages` table
4. Call `ai_service.get_answer()` for the AI response
5. Save the answer to the `messages` table
6. Return the answer and session token

**Response example:**
```json
{
  "session_token": "3f2a1b4c-...",
  "message": {
    "id": 1,
    "question": "What are the course registration deadlines?",
    "answer": "AI engine integrating in Sprint 5...",
    "is_answered": false,
    "source_documents": "[]",
    "created_at": "2026-11-21T14:00:00"
  }
}
```

---

### 2. Get Session History
```
GET /api/chat/sessions/{session_token}
```
Returns all questions and answers from a previous chat session.
Used by the frontend to reload a student's conversation.

**Response example:**
```json
{
  "session_token": "3f2a1b4c-...",
  "started_at": "2026-11-21T14:00:00",
  "messages": [
    {
      "id": 1,
      "question": "What are the registration deadlines?",
      "answer": "...",
      "is_answered": false,
      "created_at": "2026-11-21T14:00:00"
    }
  ]
}
```

**Error:** Returns `404 Not Found` if the session token is invalid.

---

## Session Management

Students are anonymous — they are identified only by a `session_token`
(a randomly generated UUID string). The token is:
- Generated automatically on the first question
- Returned to the student in the response
- Sent back by the student in future questions to continue the conversation

This allows multi-turn conversations without requiring student login.

---

## Sprint 5 Integration Note

To connect the real AI engine in Sprint 5, only this section of
`services/ai_service.py` needs to change:

```python
# CURRENT (Sprint 4 placeholder):
return {
    "answer": "AI engine integrating in Sprint 5...",
    "source_documents": [],
    "is_answered": False
}

# SPRINT 5 REPLACEMENT:
import httpx
response = httpx.post(AI_ENGINE_URL, json={"question": question})
return response.json()
```

No other backend files need to change.
