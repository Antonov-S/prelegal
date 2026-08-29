"use client";

import { useState } from "react";

import NdaDocument from "@/components/NdaDocument";
import NdaForm from "@/components/NdaForm";
import type { MndaTemplate } from "@/lib/mnda/types";
import { emptyValues, type NdaValues, type PartyValues } from "@/lib/mnda/values";

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

  const update = (patch: Partial<NdaValues>) =>
    setValues((current) => ({ ...current, ...patch }));

  const updateParty = (
    party: "party1" | "party2",
    patch: Partial<PartyValues>,
  ) =>
    setValues((current) => ({
      ...current,
      [party]: { ...current[party], ...patch },
    }));

  return (
    <div className="min-h-full bg-neutral-200 print:bg-white">
      <header className="border-b border-neutral-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="mr-auto">
            <h1 className="text-lg font-semibold text-neutral-900">
              Mutual NDA creator
            </h1>
            <p className="text-sm text-neutral-500">
              Fill in the cover page and download the completed agreement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setValues(emptyValues)}
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
        <div className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-2 print:hidden">
          <NdaForm
            template={template.coverPage}
            values={values}
            onChange={update}
            onPartyChange={updateParty}
          />
          <div className="mt-6 space-y-2 text-xs text-neutral-500">
            <p>
              Download PDF opens your browser&rsquo;s print dialog. Choose
              &ldquo;Save as PDF&rdquo; as the destination to keep a copy
              locally.
            </p>
            <p>
              Under <span className="text-neutral-700">More settings</span>,
              switch off <span className="text-neutral-700">Headers and
              footers</span> — otherwise the browser prints its own address and
              date along the edge of every page.
            </p>
          </div>
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
