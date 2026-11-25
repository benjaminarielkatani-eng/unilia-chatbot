# Sprint 5 — AI Engine Integration

## Overview

The backend uses the built-in document engine when `AI_ENGINE_URL` is blank.
The built-in engine searches active uploads and provides cited passages. This
document defines the HTTP contract for configuring a separate AI engine.

---

## For Macmillan — What You Need to Build

The backend will call your AI engine by sending an HTTP POST request to:

```
POST http://<your-server-address>/ask
```

### What the Backend Sends (Request)

The backend will send a JSON body like this:

```json
{
  "question": "What are the entry requirements for ICT at UNILIA?",
  "session_token": "abc123xyz"
}
```

| Field | Type | Description |
|---|---|---|
| `question` | string | The student's question text |
| `session_token` | string | Unique session ID — use this to track conversation history |

---

### What Your AI Engine Must Return (Response)

Your engine must reply with HTTP status **200** and a JSON body like this:

```json
{
  "answer": "To enroll in the ICT programme at UNILIA, students must have...",
  "source_documents": [
    {
      "title": "UNILIA Prospectus 2024",
      "page": 12
    }
  ],
  "is_answered": true
}
```

| Field | Type | Description |
|---|---|---|
| `answer` | string | The AI-generated answer text shown to the student |
| `source_documents` | list | List of documents used to build the answer (can be empty list `[]`) |
| `is_answered` | boolean | `true` if the AI found a relevant answer, `false` if no relevant info found |

---

### When No Answer is Found (Fallback)

If the AI engine cannot find relevant information, return:

```json
{
  "answer": "I could not find relevant information in the UNILIA documents to answer your question. Please contact the university directly.",
  "source_documents": [],
  "is_answered": false
}
```

---

## How to Update the Backend When Your Engine is Ready

When Macmillan's AI engine is deployed, Benjamin only needs to do **one thing**:

1. Open `backend/.env`
2. Change this line:
   ```
   AI_ENGINE_URL=http://localhost:8001
   ```
   To Macmillan's real address, for example:
   ```
   AI_ENGINE_URL=http://192.168.1.50:8001
   ```
3. Restart the backend server

**No other code changes are needed.**

---

## Local Fallback

The backend searches local uploads if the external engine is unreachable, times
out, or returns an invalid response. Students receive a cited passage when a
local document matches their question or a message explaining that the search
found no answer.

---

## File Locations

| File | Purpose |
|---|---|
| `backend/services/ai_service.py` | The code that calls Macmillan's engine |
| `backend/.env` | Contains `AI_ENGINE_URL` — update this with the real URL |
| `backend/routers/chat.py` | The API endpoint that uses `ai_service` |

---

*Sprint 5 — UNILIA AI Helpdesk Chatbot — Backend Team (Benjamin Katani)*
