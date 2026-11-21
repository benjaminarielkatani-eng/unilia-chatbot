from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Simple endpoint to confirm the API is running. Used for monitoring."""
    return {
        "status": "ok",
        "message": "UNILIA Helpdesk API is running"
    }
