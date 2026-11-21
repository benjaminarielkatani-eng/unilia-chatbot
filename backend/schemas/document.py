from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    """Fields shared between creating and reading a document."""
    title: str
    category: Optional[str] = None
    description: Optional[str] = None


class DocumentUpdate(BaseModel):
    """
    Fields allowed when updating a document's details.
    All fields are optional — only send the ones you want to change.
    """
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class DocumentResponse(BaseModel):
    """Fields returned when reading a document from the database."""
    id: int
    title: str
    filename: str
    file_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    uploaded_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True  # allows Pydantic to read SQLAlchemy model objects
