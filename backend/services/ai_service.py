class AIService:
    """
    Handles all communication between the backend and the AI/RAG engine.

    Sprint 4: Returns a structured placeholder response so the rest of
              the backend (sessions, DB saving, API responses) can be
              built and tested without the AI engine being ready.

    Sprint 5: The get_answer() method below will be updated to make a
              real HTTP call to Macmillan's RAG pipeline. Everything
              else in the backend stays exactly the same.
    """

    def get_answer(self, question: str) -> dict:
        """
        Send a student question to the AI engine and return the answer.

        Returns a dictionary with three keys:
        - answer:           the text answer from the AI
        - source_documents: list of document references used (empty for now)
        - is_answered:      True if the AI found an answer, False if not

        SPRINT 5 TODO — replace the return below with something like:
            import httpx
            response = httpx.post(
                AI_ENGINE_URL,
                json={"question": question}
            )
            return response.json()
        """
        # Placeholder response — replaced in Sprint 5 with the real AI call
        return {
            "answer": (
                "The AI engine is being integrated in Sprint 5. "
                "Full document-grounded answers will be available soon."
            ),
            "source_documents": [],
            "is_answered": False
        }


# Single shared instance used by all API endpoints
# (avoids creating a new object on every request)
ai_service = AIService()
