# RUN.md — UNILIA AI Helpdesk Chatbot

## Requirements
- Windows PC
- Python 3.12 installed (`py -3.12 --version` to check)
- The repo cloned: `git clone https://github.com/benjaminarielkatani-eng/unilia-chatbot.git`
- Branch: `final-integration`

---

## First-Time Setup (only once)

```powershell
cd unilia-chatbot\backend
py -3.12 -m venv venv
venv\Scripts\pip install -r requirements.txt
copy .env.example .env
# Edit .env — set SECRET_KEY to any long random string (see below)
python create_admin.py
```

**Required `.env` values:**

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./unilia.db` | No change needed |
| `SECRET_KEY` | Any 64-char random string | Run: `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` | `HS256` | No change needed |
| `JWT_EXPIRE_MINUTES` | `480` | No change needed |
| `AI_ENGINE_URL` | *(leave blank)* | Leave empty for local document engine |

---

## Start the App (every time)

### Option 1 — Double-click (Windows)
Double-click **`start.bat`** in the project root.

### Option 2 — PowerShell
```powershell
cd unilia-chatbot\backend
.\venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Access URLs

| Who | URL |
|---|---|
| This laptop | `http://localhost:8000` |
| Other laptop (same Wi-Fi) | `http://10.247.214.41:8000` |
| Student chat | `.../chat.html` |
| Admin dashboard | `.../admin.html` |
| API explorer | `.../docs` |

> **Wi-Fi IP** (`10.247.214.41`) is the address of the host laptop on the current network.
> If the network changes, run `ipconfig` and look for the new IPv4 Address.

---

## Demo Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `unilia2024` |
| Student | *(no login — open chat.html directly)* | — |

---

## Smoke Test (verify before presenting)

1. Open `http://localhost:8000/chat.html` → page loads
2. Type: *"What are the admission requirements at UNILIA?"* → answer appears with source
3. Open `http://localhost:8000/admin.html` → login with `admin / unilia2024` → dashboard loads
4. Admin → Documents → confirm "UNILIA Student Information Guide" is listed

---

## Fallback Plan (if network fails)

The app runs **fully local** — internet is NOT required for the demo.
- Run on the presentation laptop itself using `localhost:8000`
- All documents, DB, and AI engine are local files

---

## Secrets to Supply

No real secrets are needed for the demo. The only key is `SECRET_KEY` in `.env` —
any long random string works. Never commit `.env` to Git.
