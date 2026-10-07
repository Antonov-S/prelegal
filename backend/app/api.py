"""HTTP API routes."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Template
from app.nda_chat import ChatRequest, ChatResponse, chat_turn

logger = logging.getLogger(__name__)

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


@router.post("/nda/chat", response_model=ChatResponse)
async def nda_chat(request: ChatRequest) -> ChatResponse:
    try:
        return await chat_turn(request)
    except Exception:
        # The provider or the model's output failed; the client can retry the turn.
        logger.exception("NDA chat turn failed")
        raise HTTPException(status_code=502, detail="The assistant is unavailable. Please try again.")
