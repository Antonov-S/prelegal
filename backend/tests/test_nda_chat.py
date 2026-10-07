import asyncio
from datetime import date

import pytest

from app import llm
from app.nda_chat import (
    Duration,
    NdaFields,
    NdaFieldUpdates,
    NdaTurn,
    Party,
    merge_updates,
    missing_fields,
    system_prompt,
)

NO_PARTY = {"company": None, "signatoryName": None, "signatoryTitle": None, "noticeAddress": None}
NO_UPDATES = {
    "purpose": None,
    "effectiveDate": None,
    "term": None,
    "confidentiality": None,
    "governingLaw": None,
    "jurisdiction": None,
    "modifications": None,
    "party1": None,
    "party2": None,
}


def updates(**changes) -> NdaFieldUpdates:
    return NdaFieldUpdates.model_validate(NO_UPDATES | changes)


def complete_fields() -> NdaFields:
    party = Party(company="Acme", signatory_name="Ada", signatory_title="CEO", notice_address="a@x.com")
    return NdaFields(
        purpose="Partnership",
        effective_date="2026-10-07",
        term=Duration(fixed=True, years=2),
        confidentiality=Duration(fixed=False, years=1),
        governing_law="Delaware",
        jurisdiction="New Castle, DE",
        party1=party,
        party2=party,
    )


def test_empty_fields_are_all_missing_except_modifications():
    missing = missing_fields(NdaFields())
    assert len(missing) == 14
    assert "MNDA term" in missing and "Party 2 notice address" in missing
    assert not any("odification" in label for label in missing)


def test_complete_fields_have_nothing_missing():
    assert missing_fields(complete_fields()) == []


def test_merge_applies_stated_values_and_keeps_the_rest():
    current = NdaFields(governing_law="Delaware", party1=Party(company="Acme"))
    merged = merge_updates(
        current,
        updates(
            purpose="  Exploring a partnership ",
            term={"fixed": True, "years": 3},
            party1=NO_PARTY | {"signatoryName": "Ada"},
        ),
    )
    assert merged.purpose == "Exploring a partnership"
    assert merged.term == Duration(fixed=True, years=3)
    assert merged.governing_law == "Delaware"
    assert merged.party1 == Party(company="Acme", signatory_name="Ada")


def test_merge_ignores_blank_and_invalid_values():
    current = complete_fields()
    merged = merge_updates(
        current,
        updates(
            purpose="   ",
            effectiveDate="next Tuesday",
            term={"fixed": True, "years": 0},
            confidentiality={"fixed": True, "years": None},
        ),
    )
    assert merged == current


def test_merge_open_ended_duration_keeps_earlier_years():
    current = NdaFields(term=Duration(fixed=True, years=5))
    merged = merge_updates(current, updates(term={"fixed": False, "years": None}))
    assert merged.term == Duration(fixed=False, years=5)
    assert merge_updates(NdaFields(), updates(term={"fixed": False, "years": None})).term.fixed is False


def test_prompt_carries_date_values_and_missing_fields():
    prompt = system_prompt(NdaFields(governing_law="Delaware"), date(2026, 10, 7))
    assert "2026-10-07" in prompt
    assert '"governingLaw":"Delaware"' in prompt
    assert "Missing required fields: Purpose" in prompt


@pytest.fixture
def fake_llm(monkeypatch):
    """Replaces the model with a canned turn and records what it was sent."""
    calls = []

    def respond(turn: NdaTurn):
        async def complete(messages, schema, reasoning_effort="low"):
            calls.append(messages)
            return turn

        monkeypatch.setattr(llm, "complete_structured", complete)

    respond.calls = calls
    return respond


def chat(client, fields: NdaFields, text: str = "Hello"):
    return client.post(
        "/api/nda/chat",
        json={
            "messages": [{"role": "user", "content": text}],
            "fields": fields.model_dump(by_alias=True),
            "today": "2026-10-07",
        },
    )


def test_chat_merges_updates_and_reports_missing(client, fake_llm):
    fake_llm(NdaTurn(reply="What is the purpose?", updates=updates(governingLaw="Delaware")))

    response = chat(client, NdaFields(party1=Party(company="Acme")), "Delaware law please")

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "What is the purpose?"
    assert body["fields"]["governingLaw"] == "Delaware"
    assert body["fields"]["party1"]["company"] == "Acme"
    assert "Governing law" not in body["missing"]
    assert body["complete"] is False

    system, user = fake_llm.calls[0]
    assert system["role"] == "system" and "2026-10-07" in system["content"]
    assert user == {"role": "user", "content": "Delaware law please"}


def test_chat_completion_is_computed_not_trusted(client, fake_llm):
    fake_llm(NdaTurn(reply="All done!", updates=updates()))
    assert chat(client, NdaFields()).json()["complete"] is False

    assert chat(client, complete_fields()).json() | {"reply": None} == {
        "reply": None,
        "fields": complete_fields().model_dump(by_alias=True),
        "missing": [],
        "complete": True,
    }


def test_chat_reports_a_failed_model_call(client, monkeypatch):
    async def fail(*args, **kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr(llm, "complete_structured", fail)
    response = chat(client, NdaFields())
    assert response.status_code == 502
    assert "try again" in response.json()["detail"]


def test_chat_rejects_an_empty_conversation(client):
    response = client.post(
        "/api/nda/chat",
        json={"messages": [], "fields": NdaFields().model_dump(by_alias=True), "today": "2026-10-07"},
    )
    assert response.status_code == 422


def test_a_stalled_model_call_is_cut_off_at_the_deadline(monkeypatch):
    """OpenRouter's keep-alive whitespace defeats per-read timeouts, so the cap is total."""

    async def stall(**kwargs):
        await asyncio.sleep(10)

    monkeypatch.setattr(llm, "acompletion", stall)
    monkeypatch.setattr(llm, "TIMEOUT_SECONDS", 0.05)
    with pytest.raises(TimeoutError):
        asyncio.run(llm.complete_structured([], NdaTurn))


def test_merge_clears_modifications_when_withdrawn():
    current = NdaFields(modifications="Section 8 is deleted.")
    assert merge_updates(current, updates(modifications="None")).modifications == ""
    assert merge_updates(current, updates(modifications=None)) == current


@pytest.mark.parametrize(
    "said",
    [
        "courts in New Castle County, Delaware",
        "Courts located in New Castle County, Delaware",
        "the federal or state courts located in New Castle County, Delaware",
        "New Castle County, Delaware",
    ],
)
def test_merge_keeps_only_the_place_for_jurisdiction(said):
    merged = merge_updates(NdaFields(), updates(jurisdiction=said))
    assert merged.jurisdiction == "New Castle County, Delaware"
