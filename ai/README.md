# Local document answers

The backend runs the [local document engine](../backend/services/document_engine.py)
in the API process. Upload university documents from the administrator dashboard
and ask about them in student chat.

The engine searches active TXT, DOCX and text-based PDF uploads. Answers quote
the matching passage and cite the upload title, with a page number for PDFs.
Convert legacy DOC files to DOCX and run OCR on scanned PDFs before uploading
them for search.

Leave `AI_ENGINE_URL` blank for local answers. To use a separate engine, set
its URL in `backend/.env` and follow the [engine API contract](../backend/docs/sprint5_rag_integration.md).
The backend searches local documents if the configured service fails.
