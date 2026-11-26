# DEMO CHECKLIST — UNILIA AI Helpdesk Chatbot
**Author:** Isaac T. Solomon (System Integration & QA Lead)  
**Date:** 2026-11-26

---

> [!IMPORTANT]
> Run every step in order. Do not skip. The server must be running before opening any browser pages.

---

## PRE-DEMO: Start the Server

Open **PowerShell** and run:
```powershell
cd c:\Users\Benjamin Katani\unilia-chatbot\backend
.\venv\Scripts\activate
uvicorn main:app --reload
```

✅ Wait until you see: `Uvicorn running on http://127.0.0.1:8000`  
⚠️ **Keep this PowerShell window open for the entire demo.**

---

## PART 1: Student Chat Interface

**Open a browser and go to: `http://localhost:8000`**

### Step 1 — Landing Page
- [ ] The UNILIA landing page loads with the university branding
- [ ] Click **"Start Chatting"** (or similar button)
- [ ] Browser navigates to the chat interface (`/chat.html`)

### Step 2 — Ask a Question (Demo Milestone ⭐)
In the chat input box, type:
> **"What are the admission requirements at UNILIA?"**

- [ ] A typing indicator ("thinking dots") appears
- [ ] An answer is returned quoting UNILIA admission requirements (MSCE credits, English Language, etc.)
- [ ] A **Sources** section appears below the answer showing `UNILIA Student Information Guide`
- [ ] ✅ **This is the key milestone: student asked a question and got an answer from a real UNILIA document**

### Step 3 — Ask Another Question
Type:
> **"How much are the tuition fees?"**

- [ ] Answer mentions MK 850,000 for undergraduate programmes
- [ ] Source reference displayed

### Step 4 — Ask a Question Not in the Documents
Type:
> **"What is the football team's name?"**

- [ ] System returns a polite fallback message (not a hallucination)
- [ ] `is_answered` shown as false (or no sources box)

### Step 5 — Feedback Buttons
On any answered message:
- [ ] Click **"Helpful"** button
- [ ] Toast notification: "Feedback sent. Thank you."

### Step 6 — Session History
- [ ] Previous messages remain visible in the conversation
- [ ] Sidebar shows this conversation in the history list
- [ ] Start a **New Chat** using the sidebar button — previous conversation preserved in list

---

## PART 2: Admin Dashboard

**Open a new browser tab and go to: `http://localhost:8000/admin.html`**

### Step 7 — Admin Login
- [ ] Admin login form appears
- [ ] Enter: **Username:** `admin` | **Password:** `unilia2024`
- [ ] Click **Sign In**
- [ ] Dashboard overview loads with statistics cards

### Step 8 — Analytics Overview
- [ ] Stat cards show: User accounts, Questions asked, Documents, Feedback received
- [ ] "Questions by day" chart is visible
- [ ] "Recent Activity" shows the questions just asked in the demo

### Step 9 — Document Management
- [ ] Click **Documents** in the sidebar
- [ ] `UNILIA Student Information Guide` appears in the list
- [ ] Click **Upload document** → form opens with Title, Category, File fields
- [ ] Close the form (no need to upload during demo — already done)
- [ ] Change the category dropdown inline — select a different category — toast "Document category updated." appears

### Step 10 — Feedback & Reviews
- [ ] Click **Feedback & Reviews** in the sidebar
- [ ] The rating submitted in Step 5 appears in the list
- [ ] Click **Mark reviewed** on the feedback record
- [ ] Status changes to "Reviewed"

### Step 11 — Analytics Deep Dive
- [ ] Click **Analytics & Reports** in the sidebar
- [ ] "Common questions" panel shows the questions asked during the demo
- [ ] Change the date range dropdown (e.g. Last 30 days) — chart updates

### Step 12 — User Management
- [ ] Click **User Management** in the sidebar
- [ ] `admin` account appears in the list
- [ ] Click **New account** → form opens with Username, Email, Role, Password fields
- [ ] Close the form

---

## PART 3: Document → Chat Pipeline (Integration Demo)

### Step 13 — Upload a New Document and Ask About It
1. In the admin dashboard, go to **Documents** → **Upload document**
2. Upload any `.txt` file with some unique content (e.g., a file containing "The UNILIA library has 50,000 books")
3. Switch to the student chat tab
4. Ask: **"How many books does the UNILIA library have?"**
5. - [ ] Answer quotes the content from the newly uploaded document
6. - [ ] ✅ Proves: upload → text extraction → answer pipeline is live

---

## PART 4: Security Demo

### Step 14 — RBAC Enforcement
In a **new browser tab** (no login), go to:  
`http://localhost:8000/api/admin/analytics`

- [ ] Browser shows a JSON error: `"detail": "Not authenticated"` or similar
- [ ] HTTP 401/403 — proves admin routes are protected

---

## POST-DEMO: Shutdown

Close the PowerShell window running uvicorn, or press `Ctrl+C` in it.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Could not get a response from UNILIA" in chat | Server is not running — restart uvicorn |
| Admin login fails | Check `.env` has `SECRET_KEY` set; check admin was created (`create_admin.py`) |
| Chat returns "no matching answer" to known questions | UNILIA Student Guide document may not be uploaded — upload it in admin dashboard |
| Browser shows blank page | Try hard refresh `Ctrl+Shift+R` |

---

## Run Commands (Quick Reference)
```powershell
# Start server
cd c:\Users\Benjamin Katani\unilia-chatbot\backend
.\venv\Scripts\activate
uvicorn main:app --reload

# URLs
http://localhost:8000           ← Landing page
http://localhost:8000/chat.html ← Student chat
http://localhost:8000/admin.html ← Admin dashboard
http://localhost:8000/docs      ← Swagger API explorer
```
