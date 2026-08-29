import type { CoverPageTemplate } from "./types";
import type { NdaValues } from "./values";

/**
 * A value as it appears in the document. `filled` is false when the user has
 * not answered yet and we are falling back to the template's own bracketed
 * hint, which the document renders in the muted "unfilled" style.
 */
export type FieldValue = { text: string; filled: boolean };

const COVERPAGE_LINK = /<span class="coverpage_link">([^<]*)<\/span>/g;

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => HTML_ESCAPES[char]);
}

export function formatYears(years: number): string {
  return `${years} ${years === 1 ? "year" : "years"}`;
}

/**
 * Formats an ISO date for the document. The parts are read out and rebuilt as a
 * local date so the displayed day matches what was picked, regardless of the
 * viewer's time zone.
 */
export function formatEffectiveDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    "en-US",
    { year: "numeric", month: "long", day: "numeric" },
  );
}

/** Looks up a bracketed placeholder from the template by its label. */
export function hintFor(template: CoverPageTemplate, key: string): string {
  for (const section of template.sections) {
    if (key in section.hints) return section.hints[key];
  }
  return key;
}

function field(
  value: string,
  template: CoverPageTemplate,
  hintKey: string,
): FieldValue {
  const trimmed = value.trim();
  return trimmed
    ? { text: trimmed, filled: true }
    : { text: `[${hintFor(template, hintKey)}]`, filled: false };
}

/**
 * Substitutes the user's chosen duration into a checkbox option, so
 * "Expires [1 year(s)] from Effective Date." reads "Expires 2 years from
 * Effective Date." The template keeps the wording; the form supplies the number.
 */
export function applyYears(option: string, years: number): string {
  return option.replace(/\[[^\]]*\]/, formatYears(years));
}

/**
 * The six cover-page fields that the Standard Terms cross-reference, phrased to
 * read naturally in the sentences that contain them ("expires at the end of the
 * 2-year term", "will survive for the perpetual term of confidentiality").
 */
export function coverPageLinkValues(
  template: CoverPageTemplate,
  values: NdaValues,
): Record<string, FieldValue> {
  return {
    Purpose: field(values.purpose, template, "Purpose"),
    "Effective Date": field(
      formatEffectiveDate(values.effectiveDate),
      template,
      "Effective Date",
    ),
    "MNDA Term": {
      text:
        values.termMode === "expires"
          ? `${values.termYears}-year term`
          : "term, which continues until terminated",
      filled: true,
    },
    "Term of Confidentiality": {
      text:
        values.confidentialityMode === "years"
          ? `${values.confidentialityYears}-year term of confidentiality`
          : "perpetual term of confidentiality",
      filled: true,
    },
    "Governing Law": field(values.governingLaw, template, "Governing Law"),
    Jurisdiction: field(values.jurisdiction, template, "Jurisdiction"),
  };
}

/**
 * Replaces the Standard Terms' cross-reference markers with the cover page's
 * answers. Values are escaped before they reach the HTML string.
 */
export function fillCoverPageLinks(
  bodyHtml: string,
  fields: Record<string, FieldValue>,
): string {
  return bodyHtml.replace(COVERPAGE_LINK, (marker, key: string) => {
    const value = fields[key];
    if (!value) return marker;
    const className = value.filled ? "mnda-value" : "mnda-value mnda-unfilled";
    return `<span class="${className}">${escapeHtml(value.text)}</span>`;
  });
}
