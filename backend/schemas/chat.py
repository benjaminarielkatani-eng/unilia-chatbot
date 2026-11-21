from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class QuestionRequest(BaseModel):
    """Data sent by the student when asking a question."""
    question: str
    session_token: Optional[str] = None  # optional: continue an existing session


class MessageResponse(BaseModel):
    """Data returned after a student question is processed."""
    id: int
    question: str
    answer: Optional[str] = None
    is_answered: bool
    created_at: datetime

    class Config:
        from_attributes = True  # allows Pydantic to read SQLAlchemy model objects
