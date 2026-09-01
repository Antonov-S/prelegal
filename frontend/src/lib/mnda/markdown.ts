import { marked } from "marked";

/**
 * The small amount of markdown handling both template parsers need. Kept
 * together mainly for the line-ending normalisation: the templates are stored
 * with CRLF, and forgetting that is the sort of thing that only surfaces once a
 * third template is wired up.
 */

export function toLines(markdown: string): string[] {
  return markdown.replace(/\r\n/g, "\n").split("\n");
}

/** Renders markdown without wrapping it in a paragraph. */
export function inlineHtml(markdown: string): string {
  return marked.parseInline(markdown, { async: false });
}

export function blockHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true });
}

/**
 * Locates the `#` heading a template opens with. Returns the index too, since
 * both parsers read the body that follows it.
 */
export function findTitle(
  lines: string[],
): { title: string; index: number } | null {
  const index = lines.findIndex((line) => line.startsWith("# "));
  return index === -1
    ? null
    : { title: lines[index].slice(2).trim(), index };
}
