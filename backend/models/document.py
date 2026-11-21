from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database.database import Base


class Document(Base):
    """
    Stores university documents uploaded by admins.
    These documents form the knowledge base used by the AI chatbot.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    filename = Column(String, nullable=False)              # original file name
    file_path = Column(String, nullable=False)             # where the file is saved on disk
    file_type = Column(String)                             # e.g. "pdf", "docx"
    category = Column(String)                             # e.g. "academic", "administrative"
    description = Column(String)                           # optional short description
    uploaded_by = Column(Integer, ForeignKey("users.id")) # which admin uploaded this
    is_active = Column(Boolean, default=True)             # False = removed from knowledge base
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())    # auto-updates when record changes
