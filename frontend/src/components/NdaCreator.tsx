"use client";

import { useState } from "react";

import NdaDocument from "@/components/NdaDocument";
import NdaForm from "@/components/NdaForm";
import type { MndaTemplate } from "@/lib/mnda/types";
import { emptyValues, type NdaValues, type PartyValues } from "@/lib/mnda/values";

export default function NdaCreator({ template }: { template: MndaTemplate }) {
  const [values, setValues] = useState<NdaValues>(emptyValues);

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
    <div className="min-h-full bg-neutral-100 print:bg-white">
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
            onClick={() => window.print()}
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
          <p className="mt-6 text-xs text-neutral-500">
            Download PDF opens your browser&rsquo;s print dialog. Choose
            &ldquo;Save as PDF&rdquo; as the destination to keep a copy locally.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 shadow-sm print:rounded-none print:border-0 print:shadow-none">
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
