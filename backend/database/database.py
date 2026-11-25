import os
from pathlib import Path

from sqlalchemy import URL, create_engine, make_url
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load all variables from the .env file into the environment
load_dotenv()

configured_url = os.getenv("DATABASE_URL")
default_db_path = Path(__file__).resolve().parents[1] / "unilia.db"
database_url = (
    make_url(configured_url)
    if configured_url
    else URL.create("sqlite", database=str(default_db_path))
)

# Create the database engine (the main connection to the database)
# check_same_thread=False is required for SQLite to work safely with FastAPI
connect_args = {"check_same_thread": False} if database_url.get_backend_name() == "sqlite" else {}
engine = create_engine(database_url, connect_args=connect_args)

# SessionLocal is a factory: each call creates one database session (a conversation with the DB)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class that every database table model will inherit from
class Base(DeclarativeBase):
    pass


# Dependency function used by API endpoints to get a database session
# It opens a session, passes it to the endpoint, then closes it when done
def get_db():
    db = SessionLocal()
    try:
        yield db       # give the session to the endpoint
    finally:
        db.close()     # always close, even if an error occurs
