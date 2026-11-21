from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database.database import get_db
from models.document import Document
from schemas.document import DocumentResponse

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("/", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    """
    Return all active documents in the knowledge base.
    Full upload, update and delete functionality will be added in Sprint 3.
    """
    documents = db.query(Document).filter(Document.is_active == True).all()
    return documents
