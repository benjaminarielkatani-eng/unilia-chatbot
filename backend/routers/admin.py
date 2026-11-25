from datetime import datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import SecretStr
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased

from database.database import get_db
from models.chat import ChatSession, Message
from models.document import Document
from models.feedback import Feedback, FeedbackReview
from models.user import User
from routers.auth import get_current_admin
from routers.feedback import feedback_response
from schemas.admin import (
    AnalyticsResponse,
    AnalyticsTotals,
    DailyUsage,
    FeedbackResponse,
    QuestionFrequency,
    RecentActivity,
    ReviewRequest,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from services.auth_service import hash_password


router = APIRouter(
    prefix="/api/admin",
    tags=["Administration"],
    dependencies=[Depends(get_current_admin)],
)


def new_password_hash(secret: SecretStr) -> str:
    password = secret.get_secret_value()
    if not password.strip() or len(password.encode("utf-8")) > 72 or "\x00" in password:
        raise HTTPException(status_code=422, detail="Enter a nonblank password of at most 72 UTF-8 bytes.")
    return hash_password(password)


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.username)).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    user = User(
        **request.model_dump(exclude={"password"}),
        hashed_password=new_password_hash(request.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="The username or email address is already in use.") from exc
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    request: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    values = request.model_dump(exclude_unset=True)
    if any(value is None for value in values.values()):
        raise HTTPException(status_code=422, detail="User fields cannot be null.")
    if "password" in values:
        values["hashed_password"] = new_password_hash(values.pop("password"))

    removes_admin_access = values.get("role") == "staff" or values.get("is_active") is False
    if removes_admin_access:
        # Row locks serialize changes on databases with row-level locking.
        active_admins = db.scalars(
            select(User.id)
            .where(User.role == "admin", User.is_active.is_(True))
            .order_by(User.id)
            .with_for_update()
        ).all()
        if admin.id not in active_admins:
            raise HTTPException(status_code=403, detail="Administrator access is required.")

    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if not values:
        return user

    statement = update(User).where(User.id == user_id).values(**values)
    if removes_admin_access:
        other_user = aliased(User)
        other_admin_exists = select(other_user.id).where(
            other_user.id != user_id,
            other_user.role == "admin",
            other_user.is_active.is_(True),
        ).exists()
        # Enforce the invariant in the write on SQLite as well.
        statement = statement.where(
            or_(User.role != "admin", User.is_active.is_not(True), other_admin_exists)
        )
    try:
        updated_id = db.scalar(statement.returning(User.id))
        if updated_id is None:
            raise HTTPException(status_code=409, detail="At least one user must remain an active administrator.")
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="The email address is already in use.") from exc
    db.refresh(user)
    return user


def feedback_rows():
    return (
        select(Feedback, func.coalesce(Message.question, ""), FeedbackReview)
        .outerjoin(Message, Message.id == Feedback.message_id)
        .outerjoin(FeedbackReview, FeedbackReview.feedback_id == Feedback.id)
    )


@router.get("/feedback", response_model=list[FeedbackResponse])
def list_feedback(db: Session = Depends(get_db)):
    rows = db.execute(feedback_rows().order_by(Feedback.id.desc()))
    return [feedback_response(*row) for row in rows]


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
def set_feedback_review(
    feedback_id: int,
    request: ReviewRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # Lock this feedback record so reviewing twice cannot insert two review markers.
    locked_id = db.scalar(
        update(Feedback)
        .where(Feedback.id == feedback_id)
        .values(rating=Feedback.rating)
        .returning(Feedback.id)
    )
    if locked_id is None:
        raise HTTPException(status_code=404, detail="Feedback not found.")

    feedback, question, review = db.execute(
        feedback_rows().where(Feedback.id == feedback_id)
    ).one()
    if request.reviewed and review is None:
        review = FeedbackReview(feedback_id=feedback_id, reviewer_id=admin.id)
        db.add(review)
    elif not request.reviewed and review is not None:
        db.delete(review)
        review = None
    db.flush()
    response = feedback_response(feedback, question, review)
    db.commit()
    return response


def analytics_totals(db: Session) -> AnalyticsTotals:
    totals = db.execute(select(
        select(func.count()).select_from(Message).scalar_subquery().label("questions"),
        select(func.count()).where(Message.is_answered.is_(True)).scalar_subquery().label("answered"),
        select(func.count()).select_from(ChatSession).scalar_subquery().label("sessions"),
        select(func.count()).where(Document.is_active.is_(True)).scalar_subquery().label("documents"),
        select(func.count()).select_from(User).scalar_subquery().label("users"),
        select(func.count()).select_from(Feedback).scalar_subquery().label("feedback"),
        select(func.count())
        .select_from(Feedback)
        .outerjoin(FeedbackReview)
        .where(FeedbackReview.feedback_id.is_(None))
        .scalar_subquery()
        .label("pending_feedback"),
        select(func.avg(Feedback.rating)).scalar_subquery().label("average_rating"),
    )).one()
    return AnalyticsTotals.model_validate(totals._mapping)


@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db), days: int = Query(7, ge=1, le=90)):
    today = datetime.now(timezone.utc).date()
    first_day = today - timedelta(days=days - 1)
    start = datetime.combine(first_day, time.min)
    end = datetime.combine(today + timedelta(days=1), time.min)

    message_date = func.date(Message.created_at)
    question_range = (Message.created_at >= start, Message.created_at < end)
    daily_rows = db.execute(
        select(
            message_date,
            func.count(),
            func.sum(case((Message.is_answered.is_(True), 1), else_=0)),
        )
        .where(*question_range)
        .group_by(message_date)
    )
    counts_by_date = {str(date): (questions, answered) for date, questions, answered in daily_rows}
    daily = []
    for offset in range(days):
        date = first_day + timedelta(days=offset)
        questions, answered = counts_by_date.get(date.isoformat(), (0, 0))
        daily.append(DailyUsage(date=date, questions=questions, answered=answered))

    question_text = func.trim(Message.question)
    question_label = func.min(question_text)
    frequency = func.count()
    top_questions = [
        QuestionFrequency(question=question, count=count)
        for question, count in db.execute(
            select(question_label, frequency)
            .where(*question_range)
            .group_by(func.lower(question_text))
            .order_by(frequency.desc(), question_label)
            .limit(8)
        )
    ]

    activity = []
    activity_sources = (
        ("question", "Student question received", Message.created_at),
        ("document", "Document uploaded", Document.created_at),
        ("feedback", "Student rating submitted", Feedback.created_at),
    )
    for kind, label, field in activity_sources:
        dates = db.scalars(
            select(field).where(field >= start, field < end).order_by(field.desc()).limit(8)
        )
        activity.extend(RecentActivity(kind=kind, label=label, created_at=date) for date in dates)
    activity.sort(key=lambda event: event.created_at, reverse=True)
    return AnalyticsResponse(
        totals=analytics_totals(db),
        daily=daily,
        top_questions=top_questions,
        recent_activity=activity[:8],
    )
