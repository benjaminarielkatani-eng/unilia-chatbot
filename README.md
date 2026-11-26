# UNILIA AI Helpdesk Chatbot

A group project for the University of Livingstonia (UNILIA).
Students can ask questions and get answers grounded in university documents.
Administrators upload documents, review student feedback, view usage analytics,
and manage administrator and staff accounts.

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
git clone --config core.longpaths=true https://github.com/benjaminarielkatani-eng/unilia-chatbot.git
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

```powershell
# Create a virtual environment
py -3.12 -m venv venv

# Install all required packages
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Copy the optional local settings file (first setup only)
Copy-Item -LiteralPath .env.example -Destination .env

# Create an administrator account and choose its password (first setup only)
.\venv\Scripts\python.exe create_admin.py

# Run the application
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```

Open `http://127.0.0.1:8000` for student chat or
`http://127.0.0.1:8000/admin.html` to sign in as `admin`. Upload a university
document under **Documents**, then ask a question about its contents in student chat.
The API health endpoint is `http://127.0.0.1:8000/api/health`.

> ⚠️ **Important:** Set `AI_ENGINE_URL` when using a separate AI engine. Set a
> persistent `SECRET_KEY` if login tokens need to survive server restarts.
> Never share or push your `.env` file — it contains secrets.

#### 🟢 Frontend (Christopher)

Run the application from `backend/` using the steps above. FastAPI serves the
frontend and the API from the same address. Edit the HTML, CSS and JavaScript
in `frontend/` and refresh the page to see the changes.

#### 🟡 AI Engine (Macmillan & Bridjet)

The built-in engine searches active uploaded TXT, DOCX, and text-based PDF
documents. It returns relevant passages with citations and reports when it
cannot find relevant information. Leave `AI_ENGINE_URL` blank to use this mode.

To use a separate engine, set `AI_ENGINE_URL` in `backend/.env` to the base
address of a service that implements the [AI engine contract](backend/docs/sprint5_rag_integration.md).
The backend falls back to local document search if the external engine fails.

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
| POST | `/api/chat/feedback` | Rate an answer in the student's chat session |
| GET | `/api/admin/analytics` | View database-backed usage and answer trends |
| GET | `/api/admin/feedback` | List submitted student feedback |
| PATCH | `/api/admin/feedback/{id}` | Review or reopen feedback |
| GET | `/api/admin/users` | List administrator and staff accounts |
| POST | `/api/admin/users` | Create an administrator or staff account |
| PATCH | `/api/admin/users/{id}` | Update an account or reset its password |

Full API documentation (auto-generated) is available at: `http://127.0.0.1:8000/docs`

---

## 📋 Development Sprints

| Sprint | Focus | Status |
|---|---|---|
| Sprint 1 | Project setup & environment | ✅ Complete |
| Sprint 2 | Database design & initial endpoints | ✅ Complete |
| Sprint 3 | Document management | ✅ Complete |
| Sprint 4 | Student question & chat service | ✅ Complete |
| Sprint 5 | AI engine integration | ✅ Complete |
| Sprint 6 | Authentication & security | ✅ Complete |
| Sprint 7 | Analytics & feedback | ✅ Complete |
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
