"use client";

import { useState } from "react";

import NdaChat from "@/components/NdaChat";
import NdaDocument from "@/components/NdaDocument";
import type { ChatTurn } from "@/lib/mnda/chat";
import type { MndaTemplate } from "@/lib/mnda/types";
import { emptyValues, type NdaValues } from "@/lib/mnda/values";

/**
 * The name the printed document goes out under. Chrome puts the page title in
 * its print header and uses it for the suggested PDF filename, so naming the
 * agreement here beats letting either fall back to the name of this tool.
 */
function documentTitle(values: NdaValues): string {
  const companies = [values.party1.company, values.party2.company]
    .map((company) => company.trim())
    .filter(Boolean);
  return companies.length === 2
    ? `Mutual NDA — ${companies[0]} and ${companies[1]}`
    : "Mutual Non-Disclosure Agreement";
}

export default function NdaCreator({ template }: { template: MndaTemplate }) {
  const [values, setValues] = useState<NdaValues>(emptyValues);
  // Null until the first turn, so the status starts as an invitation to chat.
  const [missing, setMissing] = useState<string[] | null>(null);
  // Remounting the chat is how Reset clears the conversation.
  const [chatKey, setChatKey] = useState(0);

  const print = () => {
    const appTitle = document.title;
    const restore = () => {
      document.title = appTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = documentTitle(values);
    window.print();
  };

  const applyTurn = (turn: ChatTurn) => {
    setValues(turn.fields);
    setMissing(turn.missing);
  };

  const reset = () => {
    setValues(emptyValues);
    setMissing(null);
    setChatKey((key) => key + 1);
  };

  return (
    <div className="min-h-full bg-neutral-200 print:bg-white">
      <header className="border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold text-neutral-900">
              Mutual NDA creator
            </h1>
            <p className="text-sm text-neutral-500">
              Chat with the assistant to complete the agreement, then download it.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={print}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Download PDF
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] print:block print:max-w-none print:p-0">
        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] print:hidden">
          <Status missing={missing} />
          <div className="min-h-0 flex-1">
            <NdaChat key={chatKey} values={values} onTurn={applyTurn} />
          </div>
          <p className="text-xs text-neutral-500">
            Download PDF opens your browser&rsquo;s print dialog. Choose
            &ldquo;Save as PDF&rdquo; as the destination to keep a copy
            locally.
          </p>
        </div>

        <div className="rounded-sm bg-white shadow-lg ring-1 ring-neutral-300/70 print:rounded-none print:shadow-none print:ring-0">
          <NdaDocument
            coverPage={template.coverPage}
            standardTerms={template.standardTerms}
            values={values}
          />
        </div>
      </main>
    </div>
  );
}

/** Progress towards a complete agreement, as computed by the backend. */
function Status({ missing }: { missing: string[] | null }) {
  if (missing === null) {
    return (
      <p className="rounded-md bg-white px-4 py-3 text-sm text-neutral-600 ring-1 ring-neutral-300/70">
        Answer the assistant&rsquo;s questions and the agreement fills in as
        you go.
      </p>
    );
  }
  if (missing.length === 0) {
    return (
      <p
        role="status"
        className="rounded-md bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200"
      >
        All required information has been collected. The agreement is ready
        to download.
      </p>
    );
  }
  return (
    <p
      role="status"
      className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200"
    >
      <span className="font-medium">Still needed ({missing.length}):</span>{" "}
      {missing.join(", ")}
    </p>
  );
}
