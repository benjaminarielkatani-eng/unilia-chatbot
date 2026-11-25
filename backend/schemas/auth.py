"""
Auth Schemas — Sprint 6
=======================
These define the shape of data for login requests and token responses.
Pydantic checks that the data matches these shapes automatically.
"""

from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    """
    What the admin sends to log in.
    Example JSON: {"username": "admin", "password": "secret123"}
    """
    username: str
    password: str


class TokenResponse(BaseModel):
    """
    What the backend sends back after a successful login.
    The frontend must save this token and send it with every admin request.

    Example JSON:
    {
        "access_token": "eyJhbGciOiJIUzI1NiJ9...",
        "token_type": "bearer"
    }
    """
    access_token: str
    token_type: str = "bearer"


class CurrentUser(BaseModel):
    """
    Information about the currently logged-in admin.
    Returned by GET /api/auth/me
    """
    id: int
    username: str
    email: str
    role: str         # "admin" or "staff"
    is_active: bool

    class Config:
        from_attributes = True  # allows reading from SQLAlchemy model objects
