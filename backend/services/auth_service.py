"""
Auth Service — Sprint 6
=======================
Handles two security jobs:

1. PASSWORD HASHING
   - Never store plain passwords like "secret123" in the database
   - Instead, store a scrambled version: "$2b$12$Xt9..."
   - When admin logs in, we scramble what they typed and compare
   - If scrambled versions match → correct password
   - Like a secret fingerprint — you can verify it without knowing the original

2. JWT TOKEN CREATION & VERIFICATION
   - After a successful login, we create a "key card" (JWT token)
   - The token contains: who you are, your role, when it expires
   - The token is signed with our SECRET_KEY so nobody can fake it
   - Every protected request must include this token
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

# Load settings from .env file
load_dotenv()

# Read JWT settings from .env
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-change-this")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))

# Password hashing setup — bcrypt is the gold standard for password security
# "deprecated='auto'" means old hashes are automatically upgraded
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Scramble a plain-text password into a secure hash.
    Example: "secret123" → "$2b$12$Xt9KLHJdx..."

    Use this when creating or updating an admin account.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain-text password matches a stored hash.
    Returns True if they match, False if not.

    Use this during login to check the submitted password.
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """
    Create a signed JWT token containing the given data.

    The token automatically expires after JWT_EXPIRE_MINUTES (default: 8 hours).
    It is signed with SECRET_KEY so nobody can tamper with it.

    Args:
        data: Dictionary of info to encode, e.g. {"sub": "admin", "role": "admin"}

    Returns:
        A JWT token string, e.g. "eyJhbGciOiJIUzI1NiJ9..."
    """
    # Make a copy so we don't modify the original
    to_encode = data.copy()

    # Set the expiry time
    expire = datetime.now(timezone.utc) + timedelta(minutes=EXPIRE_MINUTES)
    to_encode["exp"] = expire

    # Sign and encode the token
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token


def decode_access_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    Returns the decoded data if valid, or None if the token is invalid/expired.

    Use this to check if an incoming request has a valid token.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        # Token is invalid, expired, or tampered with
        return None
