from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base


class Feedback(Base):
    """
    Stores student ratings and optional comments on AI answers.
    Used in Sprint 7 for analytics on chatbot performance.
    """
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))  # which answer was rated
    rating = Column(Integer, nullable=False)                  # 1 (poor) to 5 (excellent)
    comment = Column(Text, nullable=True)                     # optional written comment
    created_at = Column(DateTime, server_default=func.now())

    message = relationship("Message", back_populates="feedback")


class FeedbackReview(Base):
    """Stores administrative review state for a submitted rating."""

    __tablename__ = "feedback_reviews"

    feedback_id = Column(Integer, ForeignKey("feedback.id"), primary_key=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_at = Column(DateTime, nullable=False, server_default=func.now())
