import { blockHtml, findTitle, inlineHtml, toLines } from "./markdown";
import type { StandardTermsTemplate } from "./types";

const ATTRIBUTION = /free to use under/i;

/**
 * Parses `templates/mutual-nda.md`.
 *
 * The `<span class="coverpage_link">…</span>` markers in the source are
 * deliberately preserved in the output: they are the seams where the cover
 * page's answers get spliced in, which happens on the client as the user types.
 * See `fillCoverPageLinks` in `document.ts`.
 *
 * The closing CC BY line is lifted out of the body so it can be styled as a
 * footer, the same way the cover page's is, rather than by a CSS rule betting
 * on it being the last paragraph of the contract. It is identified by its
 * wording: the licence requires it to travel with the document, so a template
 * that has lost it should fail rather than quietly ship without it.
 */
export function parseStandardTerms(markdown: string): StandardTermsTemplate {
  const lines = toLines(markdown);
  const heading = findTitle(lines);
  if (!heading) {
    throw new Error("Standard terms template is missing its title.");
  }

  const body = lines.slice(heading.index + 1);
  const attributionIndex = body.findLastIndex((line) => line.trim() !== "");
  if (attributionIndex === -1) {
    throw new Error("Standard terms template has no body.");
  }
  if (!ATTRIBUTION.test(body[attributionIndex])) {
    throw new Error(
      "Standard terms template does not close with its licence attribution.",
    );
  }

  return {
    title: heading.title,
    bodyHtml: blockHtml(body.slice(0, attributionIndex).join("\n")),
    attributionHtml: inlineHtml(body[attributionIndex].trim()),
  };
}
