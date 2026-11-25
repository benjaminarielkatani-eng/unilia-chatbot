from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from database.database import get_db
from models.chat import ChatSession, Message
from models.feedback import Feedback, FeedbackReview
from schemas.admin import FeedbackRequest, FeedbackResponse


router = APIRouter(prefix="/api/chat", tags=["Feedback"])


def feedback_response(
    feedback: Feedback, question: str, review: FeedbackReview | None
) -> FeedbackResponse:
    return FeedbackResponse(
        id=feedback.id,
        message_id=feedback.message_id,
        question=question,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_at,
        reviewed_at=review.reviewed_at if review else None,
    )


@router.post("/feedback", response_model=FeedbackResponse)
def submit_feedback(request: FeedbackRequest, db: Session = Depends(get_db)):
    session_ids = select(ChatSession.id).where(ChatSession.session_token == request.session_token)
    # Lock the answer before reading its feedback, so concurrent retries share one rating.
    question = db.scalar(
        update(Message)
        .where(
            Message.id == request.message_id,
            Message.session_id.in_(session_ids),
            Message.answer.is_not(None),
        )
        .values(id=Message.id)
        .returning(Message.question)
    )
    if question is None:
        raise HTTPException(status_code=404, detail="Answer not found in this chat session.")

    feedback = db.scalar(
        select(Feedback)
        .where(Feedback.message_id == request.message_id)
        .order_by(Feedback.id.desc())
        .limit(1)
        .with_for_update()
    )
    comment = request.comment or None
    review = None
    if feedback is None:
        feedback = Feedback(message_id=request.message_id, rating=request.rating, comment=comment)
        db.add(feedback)
    else:
        review = db.get(FeedbackReview, feedback.id)
        if feedback.rating != request.rating or feedback.comment != comment:
            feedback.rating = request.rating
            feedback.comment = comment
            if review is not None:
                db.delete(review)
                review = None
    db.flush()
    response = feedback_response(feedback, question, review)
    db.commit()
    return response
