"""
Auth Router — Sprint 6
======================
Provides two endpoints:

  POST /api/auth/login  → Admin submits username + password, gets back a JWT token
  GET  /api/auth/me     → Admin sends their token, gets back their profile info

Also provides get_current_admin() — a reusable security check used by other
routers to protect admin-only endpoints (e.g. document upload/delete).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database.database import get_db
from models.user import User
from schemas.auth import TokenResponse, CurrentUser
from services.auth_service import verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# This tells FastAPI where the login endpoint is so it can read tokens
# from the "Authorization: Bearer <token>" header on protected requests
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ---------------------------------------------------------------------------
# DEPENDENCY — get_current_admin()
# ---------------------------------------------------------------------------
# This function is used as a "guard" on any endpoint that requires login.
# Just add:  current_user: User = Depends(get_current_admin)
# to a route's parameters and FastAPI will automatically check the token.
# ---------------------------------------------------------------------------

def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Reads and validates the JWT token from the request's Authorization header.
    Returns the logged-in User object if the token is valid.
    Raises HTTP 401 Unauthorized if anything is wrong.

    Think of this as the security guard at the door:
    - Shows a valid key card → let in
    - No card, expired card, or fake card → blocked
    """
    # Standard error to return when authentication fails
    # (We don't say exactly what failed for security reasons)
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Decode and verify the token
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_error

    # Extract the username from the token
    username: str = payload.get("sub")
    if username is None:
        raise credentials_error

    # Look up the user in the database
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_error

    # Check the account is not disabled
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Contact the administrator."
        )

    return user


# ---------------------------------------------------------------------------
# ENDPOINT: POST /api/auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Admin login endpoint.

    Accepts username and password as form fields (standard OAuth2 format).
    Returns a JWT token to use for all future admin requests.

    Example request (form data):
        username=admin&password=unilia2024

    Example response:
        {"access_token": "eyJhbGciOiJIUzI1NiJ9...", "token_type": "bearer"}
    """
    # Step 1: Find the user by username
    user = db.query(User).filter(User.username == form.username).first()

    # Step 2: Check username exists AND password is correct
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Step 3: Check the account is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Contact the administrator."
        )

    # Step 4: Create and return a JWT token
    token = create_access_token(data={"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer")


# ---------------------------------------------------------------------------
# ENDPOINT: GET /api/auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=CurrentUser)
def get_my_profile(current_user: User = Depends(get_current_admin)):
    """
    Returns the profile of the currently logged-in admin.
    Requires a valid JWT token in the Authorization header.

    Example request:
        GET /api/auth/me
        Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

    Example response:
        {"id": 1, "username": "admin", "email": "admin@unilia.ac.mw",
         "role": "admin", "is_active": true}
    """
    return current_user
