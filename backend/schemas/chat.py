import json
from ast import literal_eval
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, field_validator


class QuestionRequest(BaseModel):
    """Data sent by the student when submitting a question."""
    question: str
    session_token: Optional[str] = None  # optional: continue an existing session

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Question must not be blank.")
        return value


class MessageResponse(BaseModel):
    """Represents one question-and-answer pair."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    question: str
    answer: Optional[str] = None
    is_answered: bool
    source_documents: Optional[str] = None  # JSON string of document references
    created_at: datetime

    @field_validator("source_documents")
    @classmethod
    def normalize_legacy_sources(cls, value: str | None) -> str | None:
        if value is None:
            return None
        try:
            json.loads(value)
            return value
        except json.JSONDecodeError:
            pass

        # Older messages stored Python's list representation in the database.
        try:
            sources = literal_eval(value)
            return json.dumps(sources) if isinstance(sources, list) else value
        except (ValueError, SyntaxError, TypeError):
            return value


class AskResponse(BaseModel):
    """Full response returned to the student after asking a question."""
    session_token: str    # student uses this to continue the conversation later
    message: MessageResponse


class SessionHistoryResponse(BaseModel):
    """All messages in a chat session — for reloading a conversation."""
    model_config = ConfigDict(from_attributes=True)

    session_token: str
    started_at: datetime
    messages: List[MessageResponse]
