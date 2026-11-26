"""Create the first administrator account with a password entered at the terminal."""

from getpass import getpass

from sqlalchemy import select

from database.database import Base, SessionLocal, engine
from models.user import User
from services.auth_service import hash_password


def main() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        username = "admin"
        if db.scalar(select(User).where(User.username == username)) is not None:
            print("Admin account already exists.")
            return

        password = getpass("Admin password: ")
        if not password.strip() or len(password.encode("utf-8")) > 72:
            raise SystemExit("Enter a nonblank password of at most 72 UTF-8 bytes.")
        if password != getpass("Confirm admin password: "):
            raise SystemExit("The passwords must match.")

        db.add(User(
            username=username,
            email="admin@unilia.ac.mw",
            hashed_password=hash_password(password),
            role="admin",
            is_active=True,
        ))
        db.commit()
        print(f"Admin account created. Sign in as {username}.")


if __name__ == "__main__":
    main()
