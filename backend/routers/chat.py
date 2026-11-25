import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.database import get_db
from models.chat import ChatSession, Message
from schemas.chat import QuestionRequest, AskResponse, MessageResponse, SessionHistoryResponse
from services.ai_service import ai_service

router = APIRouter(prefix="/chat", tags=["Chat"])


# ─────────────────────────────────────────────────────────
# Helper function: find an existing session or create a new one
# ─────────────────────────────────────────────────────────
def get_or_create_session(session_token: Optional[str], db: Session) -> ChatSession:
    """
    If the student sends a session_token, find that session in the database
    so their conversation continues. If no token (or token not found),
    create a fresh session with a new unique token.

    Think of it like a hotel check-in:
    - If you have a reservation number → find your existing room
    - If not → give you a new room and a new number
    """
    if session_token:
        existing = db.query(ChatSession).filter(
            ChatSession.session_token == session_token
        ).first()
        if existing:
            return existing

    # Create a new session with a random unique token
    new_session = ChatSession(session_token=str(uuid.uuid4()))
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


# ─────────────────────────────────────────────────────────
# POST /api/chat/ask
# Main chatbot endpoint — receives a question and returns an answer
# ─────────────────────────────────────────────────────────
@router.post("/ask", response_model=AskResponse, status_code=201)
def ask_question(request: QuestionRequest, db: Session = Depends(get_db)):
    """
    Main endpoint for the UNILIA student chatbot.

    Flow:
    1. Find or create a chat session (so conversations have continuity)
    2. Save the student's question to the database
    3. Send the question to the AI engine
    4. Save the AI's answer back to the database
    5. Return the answer and session token to the student

    """
    # Step 1: Get existing session or create a new one
    session = get_or_create_session(request.session_token, db)

    # Step 2: Save the question to the database immediately
    # (answer is null for now — filled in after the AI responds)
    new_message = Message(
        session_id=session.id,
        question=request.question,
        answer=None,
        is_answered=False
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    # Step 3: Send the question to the AI engine and get a response
    ai_response = ai_service.get_answer(
        question=request.question, session_token=session.session_token, db=db
    )

    # Step 4: Update the saved message with the AI's answer
    new_message.answer = ai_response["answer"]
    new_message.is_answered = ai_response["is_answered"]
    new_message.source_documents = json.dumps(ai_response["source_documents"])
    db.commit()
    db.refresh(new_message)

    # Step 5: Return the answer and session token to the student
    return AskResponse(
        session_token=session.session_token,
        message=MessageResponse.model_validate(new_message)
    )


# ─────────────────────────────────────────────────────────
# GET /api/chat/sessions/{session_token}
# Returns the full message history for a chat session
# ─────────────────────────────────────────────────────────
@router.get("/sessions/{session_token}", response_model=SessionHistoryResponse)
def get_session_history(session_token: str, db: Session = Depends(get_db)):
    """
    Return all questions and answers for a given chat session.
    The frontend uses this to reload a previous conversation when
    a student returns to the chatbot.
    """
    session = db.query(ChatSession).filter(
        ChatSession.session_token == session_token
    ).first()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. It may have expired or the token is incorrect."
        )

    return SessionHistoryResponse(
        session_token=session.session_token,
        started_at=session.started_at,
        messages=[MessageResponse.model_validate(m) for m in session.messages]
    )
