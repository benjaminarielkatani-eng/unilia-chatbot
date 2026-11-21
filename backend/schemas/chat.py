from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QuestionRequest(BaseModel):
    """Data sent by the student when submitting a question."""
    question: str
    session_token: Optional[str] = None  # optional: continue an existing session


class MessageResponse(BaseModel):
    """Represents one question-and-answer pair."""
    id: int
    question: str
    answer: Optional[str] = None
    is_answered: bool
    source_documents: Optional[str] = None  # JSON string of document references
    created_at: datetime

    class Config:
        from_attributes = True  # allows reading from SQLAlchemy model objects


class AskResponse(BaseModel):
    """Full response returned to the student after asking a question."""
    session_token: str    # student uses this to continue the conversation later
    message: MessageResponse


class SessionHistoryResponse(BaseModel):
    """All messages in a chat session — for reloading a conversation."""
    session_token: str
    started_at: datetime
    messages: List[MessageResponse]

    class Config:
        from_attributes = True
