/**
 * Shapes for the Common Paper MNDA templates that live in the repository's
 * `templates/` directory. The markdown files are the single source of truth for
 * the agreement's wording; these types describe what the parsers extract from
 * them so the UI never has to restate legal text.
 */

/**
 * The cover-page fields the Standard Terms cross-reference, spelled exactly as
 * the templates spell them: these strings are both the `coverpage_link` marker
 * text in `mutual-nda.md` and the placeholder keys in the cover page. Naming
 * them once means a rename upstream is a one-line change here rather than a
 * search through three modules.
 */
export const COVER_PAGE_FIELDS = [
  "Purpose",
  "Effective Date",
  "MNDA Term",
  "Term of Confidentiality",
  "Governing Law",
  "Jurisdiction",
] as const;

export type CoverPageField = (typeof COVER_PAGE_FIELDS)[number];

export type CoverPageSection = {
  /** Heading text as written in the template, e.g. "Term of Confidentiality". */
  title: string;
  /** Stable identifier derived from the title, e.g. "term-of-confidentiality". */
  slug: string;
  /** The `<label>` hint that follows the heading, if the section has one. */
  label: string | null;
  /** Checkbox alternatives, in template order. */
  options: string[];
};

export type SignatureRow = {
  label: string;
  slug: string;
  /** The `<label>` note embedded in the row's first cell, if any. */
  note: string | null;
};

export type CoverPageTemplate = {
  title: string;
  usingHeading: string;
  usingBodyHtml: string;
  sections: CoverPageSection[];
  /**
   * Bracketed placeholders from the template, keyed by the line's prefix
   * ("Governing Law") or, for a bare placeholder, by its section title. Held
   * flat rather than per section because every consumer looks them up by name.
   */
  hints: Record<string, string>;
  signatureIntro: string;
  partyHeadings: string[];
  signatureRows: SignatureRow[];
  attributionHtml: string;
};

export type StandardTermsTemplate = {
  title: string;
  /**
   * Rendered HTML with the template's `<span class="coverpage_link">` markers
   * left in place, so the client can substitute the user's answers on the fly.
   */
  bodyHtml: string;
  /** The CC BY notice closing the terms, lifted out so it can be styled. */
  attributionHtml: string;
};

export type MndaTemplate = {
  coverPage: CoverPageTemplate;
  standardTerms: StandardTermsTemplate;
};
