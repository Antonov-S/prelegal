"""LLM access: one place for the model and provider configuration."""

import asyncio

from litellm import acompletion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
# Prefer Cerebras; OpenRouter falls back to other providers if it is unavailable.
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}
# Turns normally take a few seconds. OpenRouter keeps a slow request alive by
# sending whitespace every few seconds, which resets any per-read HTTP timeout,
# so the deadline is enforced over the whole call instead.
TIMEOUT_SECONDS = 30


async def complete_structured[T: BaseModel](
    messages: list[dict], schema: type[T], reasoning_effort: str = "low"
) -> T:
    """Run a chat completion constrained to `schema` and return the validated result."""
    response = await asyncio.wait_for(
        acompletion(
            model=MODEL,
            messages=messages,
            response_format=schema,
            reasoning_effort=reasoning_effort,
            extra_body=EXTRA_BODY,
        ),
        timeout=TIMEOUT_SECONDS,
    )
    return schema.model_validate_json(response.choices[0].message.content)
