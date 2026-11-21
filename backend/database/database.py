import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv

# Load all variables from the .env file into the environment
load_dotenv()

# Read the database URL from .env
# Falls back to a local SQLite file if the variable is not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./unilia.db")

# Create the database engine (the main connection to the database)
# check_same_thread=False is required for SQLite to work safely with FastAPI
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

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
