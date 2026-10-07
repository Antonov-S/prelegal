"""HTTP API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Template

router = APIRouter(prefix="/api")


class TemplateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    filename: str
    name: str
    description: str
    source: str


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/templates", response_model=list[TemplateOut])
def list_templates(session: Annotated[Session, Depends(get_session)]):
    return session.scalars(select(Template).order_by(Template.name)).all()
