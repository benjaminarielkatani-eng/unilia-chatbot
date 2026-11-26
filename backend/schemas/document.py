from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


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

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str:
        if value is None or not value.strip():
            raise ValueError("Document title must not be blank.")
        return value


class DocumentResponse(BaseModel):
    """Fields returned when reading a document from the database."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    filename: str
    file_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: bool
    uploaded_by: Optional[int] = None
    created_at: datetime
