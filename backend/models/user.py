from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database.database import Base


class User(Base):
    """
    Stores admin and staff user accounts.
    Students do not need accounts — they just use the chat.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)   # unique ID, auto-generated
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)      # NEVER store plain-text passwords
    role = Column(String, default="admin")                # "admin" or "staff"
    is_active = Column(Boolean, default=True)             # False = account disabled
    created_at = Column(DateTime, server_default=func.now())
