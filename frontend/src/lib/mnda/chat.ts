import type { NdaValues } from "./values";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/** The backend's answer to one turn: its reply and the merged document state. */
export type ChatTurn = {
  reply: string;
  fields: NdaValues;
  missing: string[];
  complete: boolean;
};

/** The user's local date as `yyyy-mm-dd`, so "today" means their today. */
export function localIsoDate(date: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Sends the whole conversation and the current values. The backend keeps no
 * state between turns, so everything it needs travels with each request.
 */
export async function sendChatTurn(
  messages: ChatMessage[],
  fields: NdaValues,
): Promise<ChatTurn> {
  const response = await fetch("/api/nda/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, fields, today: localIsoDate() }),
  });
  if (!response.ok) {
    throw new Error(`Chat request failed with status ${response.status}`);
  }
  return response.json();
}
