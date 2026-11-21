# Sprint 2 — Database Design and Initial API Endpoints

**Project:** UNILIA AI Helpdesk Chatbot
**Developer:** Benjamin Katani (ICT/01/13/23)
**Role:** Backend, Database and Security Developer
**Sprint:** 2

---

## 1. Database Technology Decision

### Decision: SQLite (Development Environment)

SQLite was selected for the development environment due to its zero-configuration
setup. No separate database server installation is required — SQLite stores the
entire database as a single file (`unilia.db`) in the project folder.

The backend uses **SQLAlchemy ORM** as the database abstraction layer. This means
the Python code is not tied to any specific database engine. Switching to
PostgreSQL for production requires changing only one line in the `.env` file:

```
# Current (development):
DATABASE_URL=sqlite:///./unilia.db

# Production switch:
DATABASE_URL=postgresql://username:password@localhost:5432/unilia_db
```

All table definitions, queries, and relationships remain unchanged.

---

## 2. Database Schema

### Table 1: `users`
Stores admin and staff accounts. Students use the chatbot anonymously.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, auto | Unique record ID |
| username | String | Unique, Not Null | Login name |
| email | String | Unique, Not Null | Email address |
| hashed_password | String | Not Null | Bcrypt-hashed password |
| role | String | Default: "admin" | "admin" or "staff" |
| is_active | Boolean | Default: True | Account status |
| created_at | DateTime | Auto | Record creation time |

### Table 2: `documents`
Stores university documents that form the AI knowledge base.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, auto | Unique record ID |
| title | String | Not Null | Document title |
| filename | String | Not Null | Original file name |
| file_path | String | Not Null | Storage path on server |
| file_type | String | — | e.g. "pdf", "docx" |
| category | String | — | e.g. "academic" |
| description | String | — | Optional summary |
| uploaded_by | Integer | FK → users.id | Uploader reference |
| is_active | Boolean | Default: True | Knowledge base status |
| created_at | DateTime | Auto | Upload time |
| updated_at | DateTime | Auto | Last update time |

### Table 3: `chat_sessions`
Tracks each student's anonymous chat session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, auto | Unique record ID |
| session_token | String | Unique, Not Null | Random session identifier |
| started_at | DateTime | Auto | Session start time |
| ended_at | DateTime | Nullable | Session end time |

### Table 4: `messages`
Stores every question asked and answer given within a session.

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, auto | Unique record ID |
| session_id | Integer | FK → chat_sessions.id | Parent session |
| question | Text | Not Null | Student's question |
| answer | Text | Nullable | AI-generated answer |
| source_documents | Text | Nullable | JSON: docs used |
| is_answered | Boolean | Default: False | Whether AI answered |
| created_at | DateTime | Auto | Question time |

### Table 5: `feedback`
Stores student ratings on AI responses (Sprint 7).

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | Integer | PK, auto | Unique record ID |
| message_id | Integer | FK → messages.id | Rated message |
| rating | Integer | Not Null | Score: 1–5 |
| comment | Text | Nullable | Optional comment |
| created_at | DateTime | Auto | Submission time |

---

## 3. Table Relationships

```
users ──────────────────── documents
(one admin uploads many documents)

chat_sessions ──── messages ──── feedback
(one session → many messages → one feedback each)
```

---

## 4. Initial API Endpoints

| Method | URL | Description | Full Implementation |
|---|---|---|---|
| GET | `/` | Root health check | Sprint 1 ✅ |
| GET | `/api/health` | API status check | Sprint 2 ✅ |
| GET | `/api/documents/` | List active documents | Sprint 3 (upload/delete) |
| POST | `/api/chat/ask` | Submit a question | Sprint 4 (AI), Sprint 5 (RAG) |

---

## 5. Technology Stack

| Component | Technology | Version |
|---|---|---|
| Web Framework | FastAPI | 0.163.1 |
| Database | SQLite (dev) | Built-in |
| ORM | SQLAlchemy | 2.1.9 |
| Data Validation | Pydantic | 2.14.3 |
| Server | Uvicorn | 0.54.0 |
| Env Management | python-dotenv | 1.2.4 |
