from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, SecretStr, StringConstraints

from schemas.auth import CurrentUser


Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]
Email = Annotated[str, StringConstraints(
    strip_whitespace=True,
    max_length=254,
    pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
)]
Role = Literal["admin", "staff"]


class UserCreate(BaseModel):
    username: Username
    email: Email
    role: Role
    password: SecretStr
    is_active: bool = True


class UserUpdate(BaseModel):
    email: Email | None = None
    role: Role | None = None
    password: SecretStr | None = None
    is_active: bool | None = None


class UserResponse(CurrentUser):
    created_at: datetime | None = None


class FeedbackRequest(BaseModel):
    session_token: str = Field(min_length=1, max_length=128)
    message_id: int = Field(gt=0)
    rating: int = Field(strict=True, ge=1, le=5)
    comment: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)] | None = None


class ReviewRequest(BaseModel):
    reviewed: bool


class FeedbackResponse(BaseModel):
    id: int
    message_id: int | None
    question: str
    rating: int
    comment: str | None
    created_at: datetime | None
    reviewed_at: datetime | None = None


class AnalyticsTotals(BaseModel):
    questions: int
    answered: int
    sessions: int
    documents: int
    users: int
    feedback: int
    pending_feedback: int
    average_rating: float | None


class DailyUsage(BaseModel):
    date: date
    questions: int
    answered: int


class QuestionFrequency(BaseModel):
    question: str
    count: int


class RecentActivity(BaseModel):
    kind: Literal["question", "document", "feedback"]
    label: str
    created_at: datetime


class AnalyticsResponse(BaseModel):
    totals: AnalyticsTotals
    daily: list[DailyUsage]
    top_questions: list[QuestionFrequency]
    recent_activity: list[RecentActivity]
