import { marked } from "marked";

import type { CoverPageSection, CoverPageTemplate, SignatureRow } from "./types";

const LABEL_LINE = /^<label>(.*)<\/label>$/;
const OPTION_LINE = /^-\s*\[[ xX]\]\s*(.*)$/;
/** A whole line that is a single bracketed placeholder, e.g. `[Today's date]`. */
const BARE_HINT = /^\[(.+)\]$/;
/** A labelled placeholder, e.g. `Governing Law: [Fill in state]`. */
const PREFIXED_HINT = /^(.+?):\s*\[(.+)\]$/;
const TABLE_LINE = /^\|/;
/** The `|:--- | :----: |` alignment row of a markdown table. */
const TABLE_DIVIDER = /^\|[\s:|-]+$/;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function inlineHtml(markdown: string): string {
  return marked.parseInline(markdown, { async: false });
}

/** Splits on blank lines, dropping empty blocks. */
function toBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line.trim() === "") {
      if (current.length > 0) blocks.push(current);
      current = [];
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

function parseSection(title: string, blocks: string[][]): CoverPageSection {
  const section: CoverPageSection = {
    title,
    slug: slugify(title),
    label: null,
    paragraphs: [],
    options: [],
    hints: {},
  };

  for (const line of blocks.flat()) {
    const label = LABEL_LINE.exec(line);
    if (label) {
      section.label = label[1];
      continue;
    }

    const option = OPTION_LINE.exec(line);
    if (option) {
      section.options.push(option[1].trim());
      continue;
    }

    const bare = BARE_HINT.exec(line);
    if (bare) {
      section.hints[title] = bare[1];
      continue;
    }

    const prefixed = PREFIXED_HINT.exec(line);
    if (prefixed) {
      section.hints[prefixed[1].trim()] = prefixed[2];
      continue;
    }

    section.paragraphs.push(line);
  }

  return section;
}

function parseSignatureTable(lines: string[]): {
  partyHeadings: string[];
  rows: SignatureRow[];
} {
  const cellsOf = (line: string) =>
    line.replace(/^\|/, "").replace(/\|$/, "").split("|");

  const [header, ...body] = lines;
  // The header's first cell is the empty corner above the row labels.
  const partyHeadings = cellsOf(header)
    .slice(1)
    .map((cell) => cell.trim())
    .filter(Boolean);

  const rows: SignatureRow[] = [];
  for (const line of body) {
    if (TABLE_DIVIDER.test(line)) continue;
    const raw = cellsOf(line)[0].trim();
    if (!raw) continue;
    const note = /<label>(.*)<\/label>/.exec(raw);
    const label = raw.replace(/<label>.*<\/label>/, "").trim();
    rows.push({ label, slug: slugify(label), note: note ? note[1] : null });
  }

  return { partyHeadings, rows };
}

/**
 * Parses `templates/mutual-nda-coverpage.md`.
 *
 * The file's structure is: an `#` title, a `##` "using this agreement"
 * preamble, a run of `###` fill-in sections, then a signature table followed by
 * the licence attribution. The paragraph immediately before the table is the
 * signing statement, which the parser lifts out of the final section.
 */
export function parseCoverPage(markdown: string): CoverPageTemplate {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const tableStart = lines.findIndex((line) => TABLE_LINE.test(line));
  if (tableStart === -1) {
    throw new Error("Cover page template has no signature table.");
  }
  let tableEnd = tableStart;
  while (tableEnd + 1 < lines.length && TABLE_LINE.test(lines[tableEnd + 1])) {
    tableEnd += 1;
  }

  const title = lines.find((line) => line.startsWith("# "))?.slice(2).trim();
  const usingIndex = lines.findIndex((line) => line.startsWith("## "));
  if (!title || usingIndex === -1) {
    throw new Error("Cover page template is missing its title or preamble.");
  }

  const sectionStarts: number[] = [];
  for (let i = usingIndex; i < tableStart; i += 1) {
    if (lines[i].startsWith("### ")) sectionStarts.push(i);
  }
  if (sectionStarts.length === 0) {
    throw new Error("Cover page template has no fill-in sections.");
  }

  const usingBody = toBlocks(lines.slice(usingIndex + 1, sectionStarts[0]));
  const sections = sectionStarts.map((start, index) => {
    const end = sectionStarts[index + 1] ?? tableStart;
    return parseSection(
      lines[start].slice(4).trim(),
      toBlocks(lines.slice(start + 1, end)),
    );
  });

  // The signing statement trails the last section, separated by a blank line.
  const lastStart = sectionStarts[sectionStarts.length - 1];
  const lastBlocks = toBlocks(lines.slice(lastStart + 1, tableStart));
  const signatureIntro =
    lastBlocks.length > 1 ? lastBlocks[lastBlocks.length - 1].join(" ") : "";
  if (signatureIntro) {
    const last = sections[sections.length - 1];
    last.paragraphs = last.paragraphs.filter(
      (paragraph) => !signatureIntro.includes(paragraph),
    );
  }

  const { partyHeadings, rows } = parseSignatureTable(
    lines.slice(tableStart, tableEnd + 1).map((line) => line.trim()),
  );

  const attribution = lines
    .slice(tableEnd + 1)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  return {
    title,
    usingHeading: lines[usingIndex].slice(3).trim(),
    usingBodyHtml: inlineHtml(usingBody.flat().join(" ")),
    sections,
    signatureIntro,
    partyHeadings,
    signatureRows: rows,
    attributionHtml: inlineHtml(attribution),
  };
}
