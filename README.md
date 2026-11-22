# UNILIA AI Helpdesk Chatbot

A group project for the University of Livingstonia (UNILIA).
This system allows students to ask questions and get intelligent answers
powered by an AI engine trained on university documents.

---

## 👥 Team Members & Responsibilities

| Name | Student ID | Role | Folder |
|---|---|---|---|
| Benjamin Katani | ICT/01/13/23 | Backend, Database & Security | `backend/` |
| Christopher Chingola | ICT/01/05/20 | Frontend (Website/UI) | `frontend/` |
| Macmillan Matumba | CEN/01/29/22 | AI / RAG Engine | `ai/` |
| Bridjet Kapulula | CEN/01/06/23 | Knowledge Base & Documents | (works with Macmillan in `ai/`) |
| Isaac T. Solomon | CEN/01/07/23 | Security & Testing | (works with Benjamin in `backend/`) |

---

## 📁 Project Structure

```
unilia-chatbot/
├── backend/        ← FastAPI server, database, API endpoints (Benjamin)
├── frontend/       ← Website / user interface (Christopher)
├── ai/             ← AI engine / RAG pipeline (Macmillan & Bridjet)
└── README.md       ← This file
```

Each team member works **only inside their own folder**.
You will not break anyone else's work as long as you stay in your folder.

---

## 🚀 Getting Started (For All Team Members)

### Step 1 — Clone the Repository (Do this ONCE on your computer)

Open a terminal (PowerShell or Command Prompt) and run:

```bash
git clone https://github.com/benjaminarielkatani-eng/unilia-chatbot.git
cd unilia-chatbot
```

This downloads the full project to your computer.

---

### Step 2 — Go to YOUR folder

Each person navigates into **their own folder** only:

**Benjamin (Backend):**
```bash
cd backend
```

**Christopher (Frontend):**
```bash
cd frontend
```

**Macmillan & Bridjet (AI Engine):**
```bash
cd ai
```

**Isaac (Testing):**
```bash
cd backend
```

---

### Step 3 — Set Up Your Environment

#### 🔵 Backend (Benjamin & Isaac)

You need Python 3.12 installed. Then:

```bash
# Create a virtual environment
py -3.12 -m venv venv

# Activate it (Windows PowerShell)
venv\Scripts\activate

# Install all required packages
pip install -r requirements.txt

# Run the backend server
uvicorn main:app --reload
```

The backend will be running at: `http://127.0.0.1:8000`  
Test it by visiting: `http://127.0.0.1:8000/api/health`

> ⚠️ **Important:** Copy `.env.example` to `.env` and fill in your values.
> Never share or push your `.env` file — it contains secrets.

#### 🟢 Frontend (Christopher)

Set up instructions will be added by Christopher once the frontend framework is chosen.

#### 🟡 AI Engine (Macmillan & Bridjet)

Set up instructions will be added by Macmillan once the AI engine is built.

---

## 🔄 How to Work Day-to-Day (Git Workflow)

Before you start working each day, **pull the latest changes** so you have everyone's updates:

```bash
git pull origin main
```

After you finish your work for the day, **save and push** your changes:

```bash
# See what files you changed
git status

# Stage your changes
git add .

# Save with a message describing what you did
git commit -m "Brief description of what you built or fixed"

# Upload to GitHub
git push origin main
```

---

## 🌐 API Overview (Backend Endpoints)

The backend exposes the following API endpoints:

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check if the server is running |
| GET | `/api/documents/` | List all uploaded documents |
| POST | `/api/documents/` | Upload a new document |
| GET | `/api/documents/{id}` | Get a specific document |
| PUT | `/api/documents/{id}` | Update document details |
| DELETE | `/api/documents/{id}` | Remove a document |
| POST | `/api/chat/ask` | Submit a student question |
| GET | `/api/chat/sessions/{token}` | Get a chat session history |

Full API documentation (auto-generated) is available at: `http://127.0.0.1:8000/docs`

---

## 📋 Development Sprints

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Project setup & environment | ✅ Complete |
| Sprint 2 | Database design & initial endpoints | ✅ Complete |
| Sprint 3 | Document management | ✅ Complete |
| Sprint 4 | Student question & chat service | ✅ Complete |
| Sprint 5 | AI engine integration | 🔄 In Progress |
| Sprint 6 | Authentication & security | ⏳ Pending |
| Sprint 7 | Analytics & feedback | ⏳ Pending |
| Sprint 8 | Verification | ⏳ Pending |
| Sprint 9 | Testing | ⏳ Pending |
| Sprint 10 | Final documentation | ⏳ Pending |

---

## ⚠️ Important Rules

1. **Never push your `.env` file** — it contains passwords and secret keys
2. **Always `git pull` before you start working** — avoid conflicts
3. **Write clear commit messages** — say what you did, not just "update"
4. **Stay in your folder** — don't edit files in other team members' folders without telling them
5. **Ask before merging** — if you're unsure, ask Benjamin (repo owner) first

---

*University of Livingstonia — ICT Department — Group Project 2026*
