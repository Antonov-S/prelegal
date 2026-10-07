"""Conversational collection of the Mutual NDA cover-page fields.

The model proposes field updates through a strict schema; this module decides
what is accepted, what is still missing, and whether the document is complete.
"""

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app import llm

MIN_YEARS = 1
MAX_YEARS = 99


class CamelModel(BaseModel):
    """Serialises with the frontend's camelCase field names."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# --- Document state, as held by the frontend ---------------------------------


class Duration(CamelModel):
    fixed: bool
    years: Annotated[int, Field(ge=MIN_YEARS, le=MAX_YEARS)]


class Party(CamelModel):
    company: str = ""
    signatory_name: str = ""
    signatory_title: str = ""
    notice_address: str = ""


class NdaFields(CamelModel):
    purpose: str = ""
    effective_date: str = ""
    term: Duration | None = None
    confidentiality: Duration | None = None
    governing_law: str = ""
    jurisdiction: str = ""
    modifications: str = ""
    party1: Party = Party()
    party2: Party = Party()


# --- What the model returns each turn ----------------------------------------


class DurationUpdate(CamelModel):
    fixed: bool = Field(description="true for a number of years, false for open-ended")
    years: int | None = Field(description="Number of years when fixed is true, else null")


class PartyUpdate(CamelModel):
    company: str | None
    signatory_name: str | None
    signatory_title: str | None
    notice_address: str | None


class NdaFieldUpdates(CamelModel):
    purpose: str | None
    effective_date: str | None = Field(description="ISO date, yyyy-mm-dd")
    term: DurationUpdate | None
    confidentiality: DurationUpdate | None
    governing_law: str | None
    jurisdiction: str | None
    modifications: str | None
    party1: PartyUpdate | None
    party2: PartyUpdate | None


class NdaTurn(CamelModel):
    reply: str
    updates: NdaFieldUpdates


# --- API shapes ---------------------------------------------------------------


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(CamelModel):
    messages: Annotated[list[ChatMessage], Field(min_length=1)]
    fields: NdaFields
    today: date


class ChatResponse(CamelModel):
    reply: str
    fields: NdaFields
    missing: list[str]
    complete: bool


# --- Field definitions and rules ----------------------------------------------

FIELD_DEFINITIONS = """\
- purpose: how confidential information may be used, e.g. "Evaluating whether to enter into a business relationship".
- effectiveDate: the date the agreement takes effect (yyyy-mm-dd).
- term: how long the MNDA lasts. Either a fixed number of years (fixed=true, years 1-99) or continuing until terminated (fixed=false).
- confidentiality: how long confidential information stays protected. Either a fixed number of years (fixed=true, years 1-99) or in perpetuity (fixed=false).
- governingLaw: the US state whose law governs the agreement, e.g. "Delaware".
- jurisdiction: the city/county and state whose courts hear disputes, e.g. "courts located in New Castle, DE".
- modifications: optional changes to the standard terms. Leave null unless the user describes some; set to "none" if they withdraw earlier ones.
- party1 / party2: for each party, the company name, the signatory's full name and title, and a notice address (email or postal address)."""

PARTY_LABELS = {
    "company": "company name",
    "signatory_name": "signatory name",
    "signatory_title": "signatory title",
    "notice_address": "notice address",
}


def missing_fields(fields: NdaFields) -> list[str]:
    """Human-readable names of the required fields that have no value yet."""
    missing = [
        label
        for label, value in [
            ("Purpose", fields.purpose),
            ("Effective date", fields.effective_date),
            ("MNDA term", fields.term),
            ("Term of confidentiality", fields.confidentiality),
            ("Governing law", fields.governing_law),
            ("Jurisdiction", fields.jurisdiction),
        ]
        if not value
    ]
    for number, party in ((1, fields.party1), (2, fields.party2)):
        missing += [
            f"Party {number} {label}"
            for attribute, label in PARTY_LABELS.items()
            if not getattr(party, attribute)
        ]
    return missing


def _text(update: str | None, current: str) -> str:
    return update.strip() if update and update.strip() else current


def _modifications(update: str | None, current: str) -> str:
    """Like `_text`, but "none" clears it: unlike the required fields it can be withdrawn."""
    if update and update.strip().lower() == "none":
        return ""
    return _text(update, current)


def _date(update: str | None, current: str) -> str:
    try:
        return date.fromisoformat(update).isoformat() if update else current
    except ValueError:
        return current


def _duration(update: DurationUpdate | None, current: Duration | None) -> Duration | None:
    if update is None:
        return current
    if not update.fixed:
        # The years are not shown for an open-ended choice; keep any earlier answer.
        return Duration(fixed=False, years=current.years if current else MIN_YEARS)
    if update.years is not None and MIN_YEARS <= update.years <= MAX_YEARS:
        return Duration(fixed=True, years=update.years)
    return current


def _party(update: PartyUpdate | None, current: Party) -> Party:
    if update is None:
        return current
    return Party(**{name: _text(getattr(update, name), getattr(current, name)) for name in PARTY_LABELS})


def merge_updates(fields: NdaFields, updates: NdaFieldUpdates) -> NdaFields:
    """Apply the model's non-null, valid updates; everything else keeps its value."""
    return NdaFields(
        purpose=_text(updates.purpose, fields.purpose),
        effective_date=_date(updates.effective_date, fields.effective_date),
        term=_duration(updates.term, fields.term),
        confidentiality=_duration(updates.confidentiality, fields.confidentiality),
        governing_law=_text(updates.governing_law, fields.governing_law),
        jurisdiction=_text(updates.jurisdiction, fields.jurisdiction),
        modifications=_modifications(updates.modifications, fields.modifications),
        party1=_party(updates.party1, fields.party1),
        party2=_party(updates.party2, fields.party2),
    )


def system_prompt(fields: NdaFields, today: date) -> str:
    missing = missing_fields(fields)
    status = (
        "Missing required fields: " + ", ".join(missing)
        if missing
        else "All required fields are collected."
    )
    return f"""\
You help a user complete the cover page of a Common Paper Mutual Non-Disclosure Agreement (MNDA) through conversation.

Fields:
{FIELD_DEFINITIONS}

Rules:
- In `updates`, set only fields the user stated or changed in their latest message; use null for everything else.
- Never invent, guess, or assume a value the user has not given. If an answer is ambiguous, ask instead of filling it.
- Use the user's own wording for text values; the examples above are illustrations, never defaults.
- Record each party detail as soon as it is given, even while the rest of that party's details are unknown.
- Parties are numbered in the order the user names them unless they say otherwise.
- Resolve relative dates against today's date, {today.isoformat()}.
- Ask for at most two missing fields at a time, in a friendly, concise way.
- When nothing required is missing, say the agreement is complete, mention that modifications to the standard terms are optional, and that the user can download the document.
- Only help with this Mutual NDA. Do not give legal advice.

Current values:
{fields.model_dump_json(by_alias=True)}

{status}"""


async def chat_turn(request: ChatRequest) -> ChatResponse:
    """Run one conversational turn and return the merged document state."""
    messages = [{"role": "system", "content": system_prompt(request.fields, request.today)}]
    messages += [message.model_dump() for message in request.messages]
    # Low effort misses fields when one message carries several of them.
    turn = await llm.complete_structured(messages, NdaTurn, reasoning_effort="medium")

    fields = merge_updates(request.fields, turn.updates)
    missing = missing_fields(fields)
    return ChatResponse(reply=turn.reply, fields=fields, missing=missing, complete=not missing)
