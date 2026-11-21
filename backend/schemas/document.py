from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    """Fields shared between creating and reading a document."""
    title: str
    category: Optional[str] = None
    description: Optional[str] = None


class DocumentCreate(DocumentBase):
    """Fields required when uploading a new document (Sprint 3)."""
    pass


class DocumentResponse(DocumentBase):
    """Fields returned when reading a document from the database."""
    id: int
    filename: str
    file_type: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True  # allows Pydantic to read SQLAlchemy model objects
