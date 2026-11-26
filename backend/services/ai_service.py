"""Answer questions from uploaded documents or a configured external engine."""

import logging
import os
from pathlib import Path

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from database.database import SessionLocal
from models.document import Document
from services.document_engine import SUPPORTED_TYPES, question_terms, read_passages, relevance


AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "").strip().rstrip("/")
REQUEST_TIMEOUT = 30.0
BACKEND_DIR = Path(__file__).resolve().parents[1]
logger = logging.getLogger(__name__)


def _unanswered(answer: str) -> dict:
    return {"answer": answer, "source_documents": [], "is_answered": False}


class AIService:
    def get_answer(self, question: str, session_token: str = "", *, db: Session | None = None) -> dict:
        if AI_ENGINE_URL:
            try:
                return self._ask_external(question, session_token)
            except (httpx.HTTPError, httpx.InvalidURL, ValueError) as error:
                logger.warning("External AI engine failed (%s). Using local documents.", type(error).__name__)
        if db is not None:
            return self._ask_documents(question, db)
        with SessionLocal() as session:
            return self._ask_documents(question, session)

    def _ask_documents(self, question: str, db: Session) -> dict:
        query_terms = question_terms(question)
        if not query_terms:
            return _unanswered("Ask a specific question about the university so I can search its documents.")

        documents = db.scalars(
            select(Document).where(Document.is_active.is_(True)).order_by(Document.id.desc())
        ).all()
        answer = None
        source = None
        best_score = (0, 0.0)
        has_text = False
        for document in documents:
            path = BACKEND_DIR / document.file_path
            file_type = (document.file_type or path.suffix).lstrip(".").lower()
            if file_type not in SUPPORTED_TYPES:
                continue
            try:
                passages = read_passages(path, file_type)
            except OSError as error:
                logger.warning("Could not open document %s (%s).", document.id, type(error).__name__)
                continue
            has_text = has_text or bool(passages)
            for passage in passages:
                score = relevance(query_terms, passage)
                if score > best_score:
                    best_score = score
                    answer = passage.text
                    source = {"title": document.title}
                    if passage.page is not None:
                        source["page"] = passage.page

        if answer is not None:
            return {"answer": answer, "source_documents": [source], "is_answered": True}
        if not has_text:
            return _unanswered("The university knowledge base has no readable documents yet.")
        return _unanswered(
            "I couldn't find a matching answer in the university documents. "
            "Try naming the programme, campus, or policy you are asking about."
        )

    def _ask_external(self, question: str, session_token: str) -> dict:
        response = httpx.post(
            f"{AI_ENGINE_URL}/ask",
            json={"question": question, "session_token": session_token},
            timeout=REQUEST_TIMEOUT,
        )
        if response.status_code != 200:
            raise ValueError(f"External AI engine returned HTTP {response.status_code}.")

        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("The AI engine response must be a JSON object.")
        answer = data.get("answer")
        sources = data.get("source_documents", [])
        is_answered = data.get("is_answered", False)
        if (
            not isinstance(answer, str) or not answer.strip()
            or not isinstance(sources, list) or not isinstance(is_answered, bool)
        ):
            raise ValueError("The AI engine returned invalid response fields.")
        return {"answer": answer, "source_documents": sources, "is_answered": is_answered}


ai_service = AIService()
