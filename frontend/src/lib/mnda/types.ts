/**
 * Shapes for the Common Paper MNDA templates that live in the repository's
 * `templates/` directory. The markdown files are the single source of truth for
 * the agreement's wording; these types describe what the parsers extract from
 * them so the UI never has to restate legal text.
 */

export type CoverPageSection = {
  /** Heading text as written in the template, e.g. "Term of Confidentiality". */
  title: string;
  /** Stable identifier derived from the title, e.g. "term-of-confidentiality". */
  slug: string;
  /** The `<label>` hint that follows the heading, if the section has one. */
  label: string | null;
  /** Prose lines that are neither a label nor a checkbox option. */
  paragraphs: string[];
  /** Checkbox alternatives, in template order. */
  options: string[];
  /**
   * Bracketed placeholders from the template, keyed by the line's prefix
   * ("Governing Law") or, for a bare placeholder, by the section title.
   * Used as input placeholders and as the hint shown for an unfilled field.
   */
  hints: Record<string, string>;
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
};

export type MndaTemplate = {
  coverPage: CoverPageTemplate;
  standardTerms: StandardTermsTemplate;
};
