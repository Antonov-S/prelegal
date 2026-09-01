"use client";

import { useState, type ReactNode } from "react";

import { hintFor } from "@/lib/mnda/document";
import type { CoverPageTemplate } from "@/lib/mnda/types";
import type { NdaValues, PartyValues } from "@/lib/mnda/values";

type PartyKey = "party1" | "party2";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 " +
  "placeholder:text-neutral-500 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 focus:outline-none";

/**
 * A titled group of fields. The `legend` is styled directly rather than paired
 * with a visually identical heading, which would have a screen reader announce
 * the group's name twice.
 */
function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-t border-neutral-200 pt-6">
      <legend className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
        {legend}
      </legend>
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * A labelled field. The template's help text is only useful if it is announced
 * with the input, so the hint gets an id and the caller attaches it — hence the
 * render prop rather than plain children.
 */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string | null;
  htmlFor: string;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-neutral-900"
      >
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="mt-0.5 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
      <div className="mt-1.5">{children(hintId)}</div>
    </div>
  );
}

const MIN_YEARS = 1;
const MAX_YEARS = 99;

/**
 * A number of years, held as text while it is being edited.
 *
 * Coercing every keystroke to a valid number would make the field impossible to
 * retype: clearing it would snap the value back to 1, and the next digit would
 * land after that 1. So the draft is free to be empty or nonsensical, only a
 * usable number is passed up, and the field settles back to the committed value
 * when it loses focus.
 *
 * The range is enforced here rather than left to `min`/`max`, which only drive
 * the spinner and a native validation pass this form never runs. Without it a
 * pasted "1e21" reaches the agreement as "1e+21 years".
 */
function YearsInput({
  years,
  label,
  disabled,
  onYearsChange,
}: {
  years: number;
  label: string;
  disabled: boolean;
  onYearsChange: (years: number) => void;
}) {
  const [draft, setDraft] = useState(String(years));
  const [committed, setCommitted] = useState(years);

  // Adopt a value changed from outside, such as by Reset, without an effect.
  if (years !== committed) {
    setCommitted(years);
    setDraft(String(years));
  }

  return (
    <input
      type="number"
      min={MIN_YEARS}
      max={MAX_YEARS}
      value={draft}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (
          Number.isInteger(parsed) &&
          parsed >= MIN_YEARS &&
          parsed <= MAX_YEARS
        ) {
          onYearsChange(parsed);
        }
      }}
      onBlur={() => setDraft(String(years))}
      className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm disabled:bg-neutral-100 disabled:text-neutral-400"
    />
  );
}

/** A radio pair whose first choice is qualified by a number of years. */
function DurationChoice({
  name,
  legend,
  hint,
  isYears,
  years,
  yearsLabel,
  openEndedLabel,
  onModeChange,
  onYearsChange,
}: {
  name: string;
  legend: string;
  hint?: string | null;
  isYears: boolean;
  years: number;
  yearsLabel: string;
  openEndedLabel: string;
  onModeChange: (isYears: boolean) => void;
  onYearsChange: (years: number) => void;
}) {
  const hintId = hint ? `${name}-hint` : undefined;

  return (
    // Describing the group rather than each radio announces the help text once,
    // as focus enters the group.
    <fieldset aria-describedby={hintId}>
      <legend className="block text-sm font-medium text-neutral-900">
        {legend}
      </legend>
      {hint ? (
        <p id={hintId} className="mt-0.5 text-xs text-neutral-500">
          {hint}
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            id={name + "-years"}
            type="radio"
            name={name}
            checked={isYears}
            onChange={() => onModeChange(true)}
            className="size-4 accent-neutral-900"
          />
          <label htmlFor={name + "-years"} className="text-sm text-neutral-800">
            {yearsLabel}
          </label>
          <YearsInput
            years={years}
            label={legend + " in years"}
            disabled={!isYears}
            onYearsChange={onYearsChange}
          />
          <span className="text-sm text-neutral-500">
            {years === 1 ? "year" : "years"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            id={name + "-open"}
            type="radio"
            name={name}
            checked={!isYears}
            onChange={() => onModeChange(false)}
            className="size-4 accent-neutral-900"
          />
          <label htmlFor={name + "-open"} className="text-sm text-neutral-800">
            {openEndedLabel}
          </label>
        </div>
      </div>
    </fieldset>
  );
}

function PartyFields({
  heading,
  party,
  partyKey,
  noticeAddressNote,
  onChange,
}: {
  heading: string;
  party: PartyValues;
  partyKey: PartyKey;
  noticeAddressNote: string | null;
  onChange: (patch: Partial<PartyValues>) => void;
}) {
  return (
    <Fieldset legend={heading}>
      <Field label="Company" htmlFor={partyKey + "-company"}>
        {(describedBy) => (
          <input
            id={partyKey + "-company"}
            type="text"
            value={party.company}
            placeholder="Acme, Inc."
            aria-describedby={describedBy}
            onChange={(event) => onChange({ company: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Print name" htmlFor={partyKey + "-name"}>
        {(describedBy) => (
          <input
            id={partyKey + "-name"}
            type="text"
            value={party.signatoryName}
            placeholder="Name of the person signing"
            aria-describedby={describedBy}
            onChange={(event) => onChange({ signatoryName: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>
      <Field label="Title" htmlFor={partyKey + "-title"}>
        {(describedBy) => (
          <input
            id={partyKey + "-title"}
            type="text"
            value={party.signatoryTitle}
            placeholder="Chief Executive Officer"
            aria-describedby={describedBy}
            onChange={(event) =>
              onChange({ signatoryTitle: event.target.value })
            }
            className={inputClass}
          />
        )}
      </Field>
      <Field
        label="Notice address"
        hint={noticeAddressNote}
        htmlFor={partyKey + "-notice"}
      >
        {(describedBy) => (
          <textarea
            id={partyKey + "-notice"}
            rows={2}
            value={party.noticeAddress}
            placeholder="legal@acme.com"
            aria-describedby={describedBy}
            onChange={(event) => onChange({ noticeAddress: event.target.value })}
            className={inputClass}
          />
        )}
      </Field>
    </Fieldset>
  );
}

export default function NdaForm({
  template,
  values,
  onChange,
  onPartyChange,
}: {
  template: CoverPageTemplate;
  values: NdaValues;
  onChange: (patch: Partial<NdaValues>) => void;
  onPartyChange: (party: PartyKey, patch: Partial<PartyValues>) => void;
}) {
  // Help text comes from the template's own <label> hints, so the form and the
  // document always explain each field the same way.
  const sectionLabel = (slug: string) =>
    template.sections.find((section) => section.slug === slug)?.label ?? null;
  const noticeAddressNote =
    template.signatureRows.find((row) => row.slug === "notice-address")?.note ??
    null;

  return (
    <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
      <Fieldset legend="Agreement details">
        <Field label="Purpose" hint={sectionLabel("purpose")} htmlFor="purpose">
          {(describedBy) => (
            <textarea
              id="purpose"
              rows={3}
              value={values.purpose}
              placeholder={hintFor(template, "Purpose")}
              aria-describedby={describedBy}
              onChange={(event) => onChange({ purpose: event.target.value })}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Effective date" htmlFor="effective-date">
          {(describedBy) => (
            <input
              id="effective-date"
              type="date"
              value={values.effectiveDate}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange({ effectiveDate: event.target.value })
              }
              className={inputClass}
            />
          )}
        </Field>

        <DurationChoice
          name="mnda-term"
          legend="MNDA term"
          hint={sectionLabel("mnda-term")}
          isYears={values.termMode === "expires"}
          years={values.termYears}
          yearsLabel="Expires after"
          openEndedLabel="Continues until terminated"
          onModeChange={(isYears) =>
            onChange({ termMode: isYears ? "expires" : "until-terminated" })
          }
          onYearsChange={(termYears) => onChange({ termYears })}
        />

        <DurationChoice
          name="term-of-confidentiality"
          legend="Term of confidentiality"
          hint={sectionLabel("term-of-confidentiality")}
          isYears={values.confidentialityMode === "years"}
          years={values.confidentialityYears}
          yearsLabel="Protected for"
          openEndedLabel="In perpetuity"
          onModeChange={(isYears) =>
            onChange({ confidentialityMode: isYears ? "years" : "perpetuity" })
          }
          onYearsChange={(confidentialityYears) =>
            onChange({ confidentialityYears })
          }
        />

        <Field label="Governing law" htmlFor="governing-law">
          {(describedBy) => (
            <input
              id="governing-law"
              type="text"
              value={values.governingLaw}
              placeholder={hintFor(template, "Governing Law")}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange({ governingLaw: event.target.value })
              }
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Jurisdiction" htmlFor="jurisdiction">
          {(describedBy) => (
            <input
              id="jurisdiction"
              type="text"
              value={values.jurisdiction}
              placeholder={hintFor(template, "Jurisdiction")}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange({ jurisdiction: event.target.value })
              }
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label="MNDA modifications"
          hint="Leave blank to use the standard terms unchanged."
          htmlFor="modifications"
        >
          {(describedBy) => (
            <textarea
              id="modifications"
              rows={2}
              value={values.modifications}
              aria-describedby={describedBy}
              onChange={(event) =>
                onChange({ modifications: event.target.value })
              }
              className={inputClass}
            />
          )}
        </Field>
      </Fieldset>

      {(["party1", "party2"] as const).map((partyKey, index) => (
        <PartyFields
          key={partyKey}
          heading={template.partyHeadings[index] ?? "Party " + (index + 1)}
          party={values[partyKey]}
          partyKey={partyKey}
          noticeAddressNote={noticeAddressNote}
          onChange={(patch) => onPartyChange(partyKey, patch)}
        />
      ))}
    </form>
  );
}
