from fastapi import FastAPI
from database.database import engine, Base

# Import all models so SQLAlchemy knows about all tables when creating the database
import models

# Import the API routers
from routers import health, documents, chat

# Create all database tables if they do not already exist
# This runs automatically every time the server starts
Base.metadata.create_all(bind=engine)

# Create the FastAPI application with descriptive metadata
app = FastAPI(
    title="UNILIA AI Helpdesk API",
    description="Backend API for the University of Livingstonia AI Helpdesk Chatbot",
    version="1.0.0"
)

# Register all routers — each handles a different area of the API
app.include_router(health.router, prefix="/api")       # /api/health
app.include_router(documents.router, prefix="/api")    # /api/documents
app.include_router(chat.router, prefix="/api")         # /api/chat


@app.get("/")
def home():
    """Root endpoint — confirms the backend server is running."""
    return {"message": "UNILIA Helpdesk backend is running"}
