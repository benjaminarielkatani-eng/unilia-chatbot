# Sprint 3 — Document Management Backend

**Project:** UNILIA AI Helpdesk Chatbot
**Developer:** Benjamin Katani (ICT/01/13/23)
**Role:** Backend, Database and Security Developer
**Sprint:** 3

---

## Overview

Sprint 3 implements the full backend for managing university documents.
Administrators can upload, view, update and remove documents that form
the AI chatbot's knowledge base.

---

## API Endpoints

### 1. List All Documents
```
GET /api/documents/
```
Returns all documents currently active in the knowledge base.

**Response example:**
```json
[
  {
    "id": 1,
    "title": "Student Handbook 2026",
    "filename": "handbook.pdf",
    "file_type": "pdf",
    "category": "academic",
    "is_active": true,
    "created_at": "2026-11-21T10:00:00"
  }
]
```

---

### 2. Get One Document
```
GET /api/documents/{id}
```
Returns the details of one specific document.

**Example:** `GET /api/documents/1`

**Error:** Returns `404 Not Found` if the document does not exist or is inactive.

---

### 3. Upload a Document
```
POST /api/documents/
Content-Type: multipart/form-data
```
Uploads a new document file and saves its metadata to the database.

**Form fields:**

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Document title |
| `category` | No | e.g. "academic", "administrative" |
| `description` | No | Short summary |
| `file` | Yes | The document file |

**Accepted file types:** `.pdf`, `.docx`, `.doc`, `.txt`

**Error:** Returns `400 Bad Request` if the file type is not allowed.

**Note:** The `uploaded_by` field is currently set to `1` as a placeholder.
It will be linked to the authenticated admin user in Sprint 6.

---

### 4. Update a Document
```
PUT /api/documents/{id}
Content-Type: application/json
```
Updates a document's title, category or description. Only the fields
included in the request body will be changed.

**Request body example:**
```json
{
  "title": "Updated Student Handbook 2026",
  "category": "academic"
}
```

**Error:** Returns `404 Not Found` if the document does not exist.

---

### 5. Delete a Document (Soft Delete)
```
DELETE /api/documents/{id}
```
Removes a document from the knowledge base by setting `is_active` to `False`.
The file and database record are **not permanently deleted**, allowing recovery
if a document is removed by mistake.

**Response example:**
```json
{
  "message": "Document 'Student Handbook 2026' has been removed from the knowledge base.",
  "document_id": 1
}
```

---

## File Storage

Uploaded files are saved in the `backend/uploads/` directory using a
UUID-prefixed filename to prevent name conflicts.

**Example:** A file uploaded as `handbook.pdf` is stored as:
```
uploads/a3f1c2d4-5678-90ab-cdef-1234567890ab_handbook.pdf
```

The `uploads/` directory is excluded from Git (via `.gitignore`) because:
- Files can be large
- Files may contain sensitive university information
- Files are managed on the server, not in the code repository

---

## Security Notes

- File type validation prevents uploading of executable or harmful files
- Soft delete protects against accidental permanent data loss
- Admin authentication (Sprint 6) will restrict upload/update/delete
  to authorised users only
