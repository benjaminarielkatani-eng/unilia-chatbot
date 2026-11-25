"""
Create First Admin Account — Sprint 6
======================================
Run this script ONCE to create the initial admin account in the database.

Usage:
    cd c:\\Users\\Benjamin Katani\\unilia-chatbot\\backend
    venv\\Scripts\\python.exe create_admin.py

After running, you can log in at POST /api/auth/login with:
    username: admin
    password: unilia2024

IMPORTANT: Change the password after first login!
"""

import sys
import os

# Make sure we can find the app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.database import SessionLocal, engine, Base
from models.user import User
from services.auth_service import hash_password

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Check if admin already exists
    existing = db.query(User).filter(User.username == "admin").first()
    if existing:
        print("Admin account already exists. No changes made.")
    else:
        admin = User(
            username="admin",
            email="admin@unilia.ac.mw",
            hashed_password=hash_password("unilia2024"),  # change this password!
            role="admin",
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("Admin account created successfully!")
        print("  Username: admin")
        print("  Password: unilia2024")
        print("")
        print("IMPORTANT: Change this password after your first login!")
finally:
    db.close()
