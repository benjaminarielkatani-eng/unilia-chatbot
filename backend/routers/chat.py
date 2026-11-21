import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database.database import get_db
from schemas.chat import QuestionRequest

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/ask")
def ask_question(request: QuestionRequest, db: Session = Depends(get_db)):
    """
    Receive a student's question.
    - Sprint 4 will add: saving the question to the database and
      sending it to the AI engine.
    - Sprint 5 will add: full RAG pipeline and AI-generated answers.
    For now, this endpoint confirms the question was received.
    """
    # Generate a new session token if the student does not have one yet
    session_token = request.session_token or str(uuid.uuid4())

    return {
        "session_token": session_token,
        "question": request.question,
        "answer": "AI integration is being built in Sprint 4.",
        "is_answered": False
    }
