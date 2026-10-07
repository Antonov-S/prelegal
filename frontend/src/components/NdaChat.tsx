"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { sendChatTurn, type ChatMessage, type ChatTurn } from "@/lib/mnda/chat";
import type { NdaValues } from "@/lib/mnda/values";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'll help you put together a Mutual NDA. Who are the two parties, and what will they be sharing confidential information for?",
};

/**
 * The conversation that fills in the agreement. It holds only the messages;
 * the document values live with the caller, which receives each merged turn.
 */
export default function NdaChat({
  values,
  onTurn,
}: {
  values: NdaValues;
  onTurn: (turn: ChatTurn) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const send = async () => {
    const text = draft.trim();
    if (!text || pending) return;

    const sent: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(sent);
    setDraft("");
    setError(null);
    setPending(true);
    try {
      const turn = await sendChatTurn(sent, values);
      setMessages([...sent, { role: "assistant", content: turn.reply }]);
      onTurn(turn);
    } catch {
      // Put the message back so it can be sent again unchanged.
      setMessages(messages);
      setDraft(text);
      setError("The assistant could not respond. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="NDA assistant"
      className="flex h-[32rem] flex-col rounded-md bg-white shadow-sm ring-1 ring-neutral-300/70 lg:h-full"
    >
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((message, index) => (
          <p
            key={index}
            className={
              "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line " +
              (message.role === "user"
                ? "ml-auto bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-900")
            }
          >
            <span className="sr-only">
              {message.role === "user" ? "You: " : "Assistant: "}
            </span>
            {message.content}
          </p>
        ))}
        {pending ? (
          <p className="text-sm text-neutral-500">Assistant is typing…</p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-neutral-200 p-3"
      >
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={2}
          value={draft}
          placeholder="Type your answer…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter starts a new line.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:bg-neutral-400"
        >
          Send
        </button>
      </form>
    </section>
  );
}
