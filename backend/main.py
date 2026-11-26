from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from database.database import engine, Base

# Import all models so SQLAlchemy knows about all tables when creating the database
import models

# Import the API routers
from routers import admin, auth, chat, documents, feedback, health

# Create all database tables if they do not already exist
# This runs automatically every time the server starts
Base.metadata.create_all(bind=engine)

# Create the FastAPI application with descriptive metadata
app = FastAPI(
    title="UNILIA AI Helpdesk API",
    description="Backend API for the University of Livingstonia AI Helpdesk Chatbot",
    version="1.0.0"
)

# ─────────────────────────────────────────────────────────────
# CORS — Cross-Origin Resource Sharing (Sprint 8)
# ─────────────────────────────────────────────────────────────
# This allows Christopher's frontend (running on a different port
# or domain) to make API calls to this backend.
#
# Think of it like an official visitor pass:
# Without this, the browser blocks frontend → backend requests.
#
# In production, replace "*" with the actual frontend URL e.g.:
#   "https://unilia-helpdesk.ac.mw"
# ─────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # allow ALL origins (fine for development)
    allow_credentials=True,
    allow_methods=["*"],          # allow GET, POST, PUT, DELETE, PATCH, etc.
    allow_headers=["*"],          # allow Authorization header (needed for JWT)
)

# Register all routers — each handles a different area of the API
app.include_router(health.router, prefix="/api")       # /api/health
app.include_router(auth.router)                        # /api/auth/login, /api/auth/me
app.include_router(documents.router, prefix="/api")    # /api/documents
app.include_router(chat.router, prefix="/api")         # /api/chat
app.include_router(feedback.router)                    # /api/chat/feedback
app.include_router(admin.router)                       # /api/admin


FRONTEND_DIR = Path(__file__).resolve().parents[1] / "frontend"
FRONTEND_FILES = {
    "index.html",
    "chat.html",
    "admin.html",
    "style.css",
    "admin.css",
    "script.js",
    "chat-storage.js",
    "chat.js",
    "admin.js",
    "images/unilia-logo.png",
    "images/AI scholar transparent.png",
    "images/campus.png",
}


@app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def serve_frontend(path: str):
    filename = path or "index.html"
    if filename not in FRONTEND_FILES:
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse(FRONTEND_DIR / filename)
