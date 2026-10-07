"""Database engine setup and per-request sessions."""

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def reset_db(engine: Engine) -> None:
    """Drop and recreate every table. The development database is disposable."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def get_session(request: Request) -> Iterator[Session]:
    """Yield a session bound to the application's engine."""
    with Session(request.app.state.engine) as session:
        yield session
