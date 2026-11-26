# Sprint 7 — Feedback & Analytics

## Overview

Sprint 7 adds the ability for students to rate AI answers, and gives
administrators a full analytics dashboard to monitor chatbot performance.

---

## New Endpoints

### Student Endpoints (No Login Required)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat/feedback` | Student submits a star rating + optional comment on an AI answer |

### Admin Endpoints (Login Required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/analytics` | Full analytics dashboard — totals, daily usage, top questions, activity |
| GET | `/api/admin/feedback` | List all student feedback submissions |
| PATCH | `/api/admin/feedback/{id}` | Mark a feedback entry as reviewed |
| GET | `/api/admin/users` | List all admin user accounts |
| POST | `/api/admin/users` | Create a new admin/staff user account |
| PATCH | `/api/admin/users/{id}` | Update or deactivate a user account |

---

## How Feedback Works

```
1. Student asks a question → gets an answer (message_id is returned)
2. Student rates the answer: POST /api/chat/feedback
   {
     "session_token": "abc123",
     "message_id": 42,
     "rating": 4,
     "comment": "Good answer but could be more specific"
   }
3. Rating is saved to the feedback table (1=poor, 5=excellent)
4. Admin reviews feedback at GET /api/admin/feedback
5. Admin marks it reviewed: PATCH /api/admin/feedback/{id}
   {"reviewed": true}
```

---

## Analytics Dashboard — What It Shows

**GET `/api/admin/analytics?days=7`** (default: last 7 days, max: 90 days)

```json
{
  "totals": {
    "questions": 150,
    "answered": 120,
    "sessions": 45,
    "documents": 12,
    "users": 2,
    "feedback": 30,
    "pending_feedback": 8,
    "average_rating": 3.8
  },
  "daily": [
    {"date": "2026-11-20", "questions": 25, "answered": 20},
    ...
  ],
  "top_questions": [
    {"question": "What are the entry requirements?", "count": 8},
    ...
  ],
  "recent_activity": [
    {"kind": "question", "label": "Student question received", "created_at": "..."},
    ...
  ]
}
```

---

## Security Design

| Endpoint | Who can use it |
|---|---|
| POST `/api/chat/feedback` | Any student (no login needed) |
| GET `/api/admin/analytics` | Admin only (JWT token required) |
| GET `/api/admin/feedback` | Admin only (JWT token required) |
| All `/api/admin/users/*` | Admin only (JWT token required) |

---

## Database Tables Used

| Table | Purpose |
|---|---|
| `feedback` | Stores student ratings and comments |
| `feedback_reviews` | Tracks which feedback an admin has reviewed |
| `messages` | Source of questions and answer status |
| `chat_sessions` | Tracks student sessions |
| `documents` | Used in analytics totals count |
| `users` | Used in analytics totals count |

---

## For Isaac (Testing Guide)

1. Submit feedback on a message → `POST /api/chat/feedback` with rating 1–5
2. Try rating = 0 or 6 → should return HTTP 422 (validation error)
3. Try submitting feedback for a non-existent message_id → HTTP 404
4. Admin views feedback → `GET /api/admin/feedback` (requires login)
5. Admin marks feedback reviewed → `PATCH /api/admin/feedback/{id}` with `{"reviewed": true}`
6. Check analytics → `GET /api/admin/analytics?days=7`
7. Try analytics without login → should return HTTP 401

---

## For Christopher (Frontend Integration)

To show a star rating widget after each answer, call:

```javascript
fetch('/api/chat/feedback', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        session_token: currentSessionToken,
        message_id: messageId,
        rating: starRating,        // 1 to 5
        comment: optionalComment   // or null
    })
})
```

---

*Sprint 7 — UNILIA AI Helpdesk Chatbot — Backend Team (Benjamin Katani)*
