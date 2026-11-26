import shutil
import uuid
from pathlib import Path, PureWindowsPath
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database.database import get_db
from models.document import Document
from models.user import User
from schemas.document import DocumentResponse, DocumentUpdate
from routers.auth import get_current_admin   # Sprint 6: security guard for admin endpoints

router = APIRouter(prefix="/documents", tags=["Documents"])

# File types the system accepts — only common document formats
ALLOWED_TYPES = {".pdf", ".docx", ".doc", ".txt"}

# Folder where uploaded files are saved on the server
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"


# ─────────────────────────────────────────────
# GET /api/documents/
# Returns all active documents in the knowledge base
# ─────────────────────────────────────────────
@router.get("/", response_model=List[DocumentResponse])
def get_all_documents(db: Session = Depends(get_db)):
    """Return all documents that are active in the knowledge base."""
    documents = db.query(Document).filter(Document.is_active == True).all()
    return documents


# ─────────────────────────────────────────────
# GET /api/documents/{id}
# Returns one specific document by its ID
# ─────────────────────────────────────────────
@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int, db: Session = Depends(get_db)):
    """Return a single document by its ID. Returns 404 if not found."""
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_active == True
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document


# ─────────────────────────────────────────────
# POST /api/documents/
# Upload a new document file and save its metadata
# ─────────────────────────────────────────────
@router.post("/", response_model=DocumentResponse, status_code=201)
def upload_document(
    title: str = Form(...),                        # document title (required)
    category: str | None = Form(None),             # e.g. "academic", "administrative"
    description: str | None = Form(None),          # optional short description
    file: UploadFile = File(...),                  # the actual file being uploaded
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Sprint 6: must be logged-in admin
):
    """
    Upload a new university document and save its metadata to the database.
    Accepted file types: PDF, DOCX, DOC, TXT.
    Requires admin login (JWT token in Authorization header).
    """
    if not title.strip():
        raise HTTPException(status_code=422, detail="Document title must not be blank.")

    filename = PureWindowsPath(file.filename or "").name
    file_extension = Path(filename).suffix.lower()
    if file_extension not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_extension}' is not allowed. "
                   f"Accepted types: {', '.join(sorted(ALLOWED_TYPES))}"
        )

    UPLOAD_DIR.mkdir(exist_ok=True)
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{file_extension}"

    # Save the document metadata to the database
    new_document = Document(
        title=title,
        filename=filename,               # original filename shown to users
        file_path=str(file_path),         # actual path on disk
        file_type=file_extension.lstrip("."),  # e.g. "pdf" (without the dot)
        category=category,
        description=description,
        uploaded_by=current_user.id,     # Sprint 6: real logged-in admin ID
        is_active=True
    )

    buffer = file_path.open("xb")
    try:
        with buffer:
            shutil.copyfileobj(file.file, buffer)
        db.add(new_document)
        db.commit()
    except Exception:
        try:
            db.rollback()
        finally:
            file_path.unlink(missing_ok=True)
        raise

    db.refresh(new_document)             # reload the record to get auto-generated fields

    return new_document


# ─────────────────────────────────────────────
# PUT /api/documents/{id}
# Update a document's metadata (not the file itself)
# ─────────────────────────────────────────────
@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    update_data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Sprint 6: must be logged-in admin
):
    """
    Update a document's title, category or description.
    Only the fields you send will be changed — others stay the same.
    Requires admin login (JWT token in Authorization header).
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_active == True
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Only update the fields that were actually sent in the request
    update_fields = update_data.model_dump(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)

    return document


# ─────────────────────────────────────────────
# DELETE /api/documents/{id}
# Soft-delete: marks document as inactive (does NOT permanently erase it)
# ─────────────────────────────────────────────
@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)  # Sprint 6: must be logged-in admin
):
    """
    Soft-delete a document by setting is_active to False.
    The document record and file remain on disk — it just disappears
    from the knowledge base. This allows recovery if deleted by mistake.
    Requires admin login (JWT token in Authorization header).
    """
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.is_active == True
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    document.is_active = False    # soft delete — not permanently removed
    db.commit()

    return {
        "message": f"Document '{document.title}' has been removed from the knowledge base.",
        "document_id": document_id
    }
