import { marked } from "marked";

import type { StandardTermsTemplate } from "./types";

/**
 * Parses `templates/mutual-nda.md`.
 *
 * The `<span class="coverpage_link">…</span>` markers in the source are
 * deliberately preserved in the output: they are the seams where the cover
 * page's answers get spliced in, which happens on the client as the user types.
 * See `fillCoverPageLinks` in `document.ts`.
 */
export function parseStandardTerms(markdown: string): StandardTermsTemplate {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const titleIndex = lines.findIndex((line) => line.startsWith("# "));
  if (titleIndex === -1) {
    throw new Error("Standard terms template is missing its title.");
  }

  return {
    title: lines[titleIndex].slice(2).trim(),
    bodyHtml: marked.parse(lines.slice(titleIndex + 1).join("\n"), {
      async: false,
      gfm: true,
    }),
  };
}
