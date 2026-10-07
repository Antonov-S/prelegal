import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NdaCreator from "@/components/NdaCreator";
import type { ChatTurn } from "@/lib/mnda/chat";
import { loadMndaTemplate } from "@/lib/mnda/source";
import { emptyValues, type NdaValues } from "@/lib/mnda/values";

const template = loadMndaTemplate();
const fetchMock = vi.fn();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function turn(fields: Partial<NdaValues>, reply = "Thanks!", missing = ["Purpose"]): ChatTurn {
  return {
    reply,
    fields: { ...emptyValues, ...fields },
    missing,
    complete: missing.length === 0,
  };
}

function respondWith(...turns: ChatTurn[]) {
  for (const next of turns) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(next), { status: 200 }),
    );
  }
}

function renderApp() {
  render(<NdaCreator template={template} />);
  const user = userEvent.setup();
  return {
    user,
    document: () => screen.getByRole("article"),
    say: async (text: string) => {
      await user.type(screen.getByLabelText("Message"), text);
      await user.click(screen.getByRole("button", { name: "Send" }));
    },
  };
}

function requestBody(call: number) {
  return JSON.parse(fetchMock.mock.calls[call][1].body);
}

describe("chatting", () => {
  it("opens with the assistant's first question", () => {
    renderApp();
    expect(screen.getByRole("log")).toHaveTextContent(/Who are the two parties/);
  });

  it("sends the conversation and shows the reply", async () => {
    const { say } = renderApp();
    respondWith(turn({}, "What is the purpose?"));

    await say("Acme and Globex");

    expect(fetchMock).toHaveBeenCalledWith("/api/nda/chat", expect.anything());
    const body = requestBody(0);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual([
      "assistant",
      "user",
    ]);
    expect(body.messages[1].content).toBe("Acme and Globex");
    expect(body.fields).toEqual(emptyValues);
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const log = screen.getByRole("log");
    expect(await within(log).findByText("What is the purpose?")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toHaveValue("");
  });

  it("writes extracted values into the document", async () => {
    const { say, document } = renderApp();
    respondWith(turn({ governingLaw: "Delaware", term: { fixed: true, years: 3 } }));

    await say("Delaware law, three years");

    // Once on the cover page, twice more where section 9 cites it.
    expect(await within(document()).findAllByText("Delaware")).toHaveLength(3);
    expect(within(document()).getByText("3-year term")).toBeInTheDocument();
  });

  it("sends back the values collected so far on the next turn", async () => {
    const { say } = renderApp();
    const first = turn({ governingLaw: "Delaware" }, "And the purpose?");
    respondWith(first, turn({ governingLaw: "Delaware", purpose: "Partnership" }));

    await say("Delaware");
    await screen.findByText("And the purpose?");
    await say("Partnership");

    const body = requestBody(1);
    expect(body.fields).toEqual(first.fields);
    expect(body.messages).toHaveLength(4);
  });

  it("lists what is still missing", async () => {
    const { say } = renderApp();
    respondWith(turn({}, "Next?", ["Purpose", "Jurisdiction"]));

    await say("Hi");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Still needed (2): Purpose, Jurisdiction",
    );
  });

  it("says when every required field is collected", async () => {
    const { say } = renderApp();
    respondWith(turn({}, "All set.", []));

    await say("That's everything");

    expect(await screen.findByRole("status")).toHaveTextContent(
      "All required information has been collected",
    );
  });

  it("keeps the message to retry when the assistant fails", async () => {
    const { say } = renderApp();
    fetchMock.mockResolvedValueOnce(new Response("", { status: 502 }));

    await say("Acme and Globex");

    expect(await screen.findByRole("alert")).toHaveTextContent(/try again/);
    expect(screen.getByLabelText("Message")).toHaveValue("Acme and Globex");
    expect(within(screen.getByRole("log")).queryByText("Acme and Globex")).toBeNull();
  });

  it("renders an extracted answer as text, never as markup", async () => {
    const { say, document } = renderApp();
    respondWith(turn({ governingLaw: "<img src=x onerror=alert(1)>" }));

    await say("Hi");

    expect(
      (await within(document()).findAllByText("<img src=x onerror=alert(1)>")).length,
    ).toBeGreaterThan(0);
    expect(document().querySelector("img")).toBeNull();
  });
});

describe("resetting", () => {
  it("clears the conversation, the status and the document together", async () => {
    const { user, say, document } = renderApp();
    respondWith(turn({ governingLaw: "Delaware" }, "Noted."));

    await say("Delaware");
    await screen.findByText("Noted.");
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByText("Noted.")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(within(document()).getAllByText("[Fill in state]")).toHaveLength(3);
  });
});

describe("downloading", () => {
  const print = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("print", print);
    window.document.title = "Prelegal — Mutual NDA creator";
  });

  afterEach(() => print.mockClear());

  it("opens the print dialog", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });

  // Chrome names the saved file after the page title and prints it in its
  // header, so the agreement's name has to stand in for the app's while
  // printing, then give way again.
  it("names the page after the agreement while printing", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(window.document.title).toBe("Mutual Non-Disclosure Agreement");

    window.dispatchEvent(new Event("afterprint"));
    expect(window.document.title).toBe("Prelegal — Mutual NDA creator");
  });

  it("names both companies once they are known", async () => {
    const { user, say } = renderApp();
    respondWith(
      turn({
        party1: { ...emptyValues.party1, company: "Acme, Inc." },
        party2: { ...emptyValues.party2, company: "Globex Corp" },
      }, "Got it."),
    );

    await say("Acme, Inc. and Globex Corp");
    await screen.findByText("Got it.");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(window.document.title).toBe(
      "Mutual NDA — Acme, Inc. and Globex Corp",
    );
  });
});
