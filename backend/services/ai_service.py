"""
AI Service — Sprint 5
=====================
This module handles all communication between the UNILIA backend and
Macmillan's AI/RAG engine.

How it works (simple version):
  1. Student types a question on the frontend
  2. Frontend sends question to our backend (POST /api/chat/ask)
  3. Our backend sends it here (get_answer)
  4. THIS FILE sends it to Macmillan's AI engine
  5. Macmillan's engine searches university documents and builds an answer
  6. The answer comes back here and is returned to the student

To update when Macmillan's engine is ready:
  - Open the .env file
  - Change AI_ENGINE_URL to Macmillan's real address
  - That is ALL — no other code changes needed
"""

import httpx
import os
from dotenv import load_dotenv

# Load settings from the .env file
load_dotenv()

# Read Macmillan's AI engine address from .env
# If not set, fall back to localhost:8001 as a safe default
AI_ENGINE_URL = os.getenv("AI_ENGINE_URL", "http://localhost:8001")

# How many seconds to wait for the AI engine before giving up
# (If Macmillan's engine takes longer than this, we return a timeout message)
REQUEST_TIMEOUT = 30.0


class AIService:
    """
    Handles all communication between the backend and the AI/RAG engine.

    Sprint 4: Returned a placeholder response (fake answer).
    Sprint 5: Makes a real HTTP call to Macmillan's AI engine.

    The rest of the backend (sessions, database saving, API responses)
    stays exactly the same — only this file changed.
    """

    def get_answer(self, question: str, session_token: str = "") -> dict:
        """
        Send a student question to Macmillan's AI engine and return the answer.

        Args:
            question:      The student's question text
            session_token: The session ID (helps AI remember conversation context)

        Returns a dictionary with three keys:
            answer:           The text answer from the AI engine
            source_documents: List of document references used to build the answer
            is_answered:      True if the AI found an answer, False if not
        """

        # Build the request we will send to Macmillan's engine
        # This is the agreed API contract (see docs/sprint5_rag_integration.md)
        request_payload = {
            "question": question,
            "session_token": session_token
        }

        try:
            # Send the question to Macmillan's AI engine and wait for the answer
            # timeout=REQUEST_TIMEOUT means: if no reply in 30 seconds, give up
            response = httpx.post(
                f"{AI_ENGINE_URL}/ask",
                json=request_payload,
                timeout=REQUEST_TIMEOUT
            )

            # Check if the AI engine returned a success response (HTTP 200)
            if response.status_code == 200:
                # Parse the JSON answer from the AI engine
                data = response.json()

                # Return the answer in our standard format
                return {
                    "answer": data.get("answer", "No answer text received from AI engine."),
                    "source_documents": data.get("source_documents", []),
                    "is_answered": data.get("is_answered", False)
                }
            else:
                # AI engine returned an error (e.g. HTTP 500)
                # We don't crash — we return a friendly message instead
                return {
                    "answer": (
                        f"The AI engine returned an unexpected response "
                        f"(status code: {response.status_code}). "
                        f"Please try again or contact support."
                    ),
                    "source_documents": [],
                    "is_answered": False
                }

        except httpx.ConnectError:
            # This happens when Macmillan's engine is not running or unreachable
            # Like calling a phone number that doesn't exist
            return {
                "answer": (
                    "The AI engine is currently unavailable. "
                    "It may be offline or starting up. "
                    "Please try again in a few minutes."
                ),
                "source_documents": [],
                "is_answered": False
            }

        except httpx.TimeoutException:
            # This happens when Macmillan's engine takes too long to respond
            # Like a phone call where nobody picks up after 30 rings
            return {
                "answer": (
                    "The AI engine took too long to respond (timeout after "
                    f"{int(REQUEST_TIMEOUT)} seconds). "
                    "Please try again with a simpler question."
                ),
                "source_documents": [],
                "is_answered": False
            }

        except Exception as e:
            # Catch-all for any other unexpected error
            # We log it but never show raw error details to the student
            return {
                "answer": (
                    "An unexpected error occurred while contacting the AI engine. "
                    "Please try again or contact your administrator."
                ),
                "source_documents": [],
                "is_answered": False
            }


# Single shared instance used by all API endpoints
# (Creates the AIService object once, reuses it for every request)
# Think of it like one phone — everyone uses the same phone to call Macmillan
ai_service = AIService()
