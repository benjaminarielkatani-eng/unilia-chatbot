from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database.database import Base


class ChatSession(Base):
    """
    Tracks each student's chat session.
    A session starts when a student opens the chat and ends when they leave.
    Students are anonymous — identified only by a session token.
    """
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String, unique=True, nullable=False)  # random code per session
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)                   # null while session is active

    # One session can have many messages
    messages = relationship("Message", back_populates="session")


class Message(Base):
    """
    Stores each question a student asks and the AI's answer.
    One message = one question + one answer pair.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))  # which session this belongs to
    question = Column(Text, nullable=False)                        # the student's question
    answer = Column(Text, nullable=True)                           # AI's answer (null if unanswered)
    source_documents = Column(Text, nullable=True)                 # JSON: which docs were used
    is_answered = Column(Boolean, default=False)                   # True = AI found an answer
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
    feedback = relationship("Feedback", back_populates="message")
