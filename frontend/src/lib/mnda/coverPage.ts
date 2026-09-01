import { findTitle, inlineHtml, toLines } from "./markdown";
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
/**
 * The execution clause, which sits between the last section and the signature
 * table with no heading of its own. Matching it by wording rather than by
 * position means a template that stops carrying it fails loudly here, instead
 * of quietly producing an agreement nobody has agreed to.
 */
const SIGNING_STATEMENT = /^By signing/i;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The `[start, end)` of the last blank-line-delimited block before `end`. */
function lastBlockBefore(lines: string[], end: number): [number, number] {
  let blockEnd = end;
  while (blockEnd > 0 && lines[blockEnd - 1].trim() === "") blockEnd -= 1;

  let blockStart = blockEnd;
  while (blockStart > 0 && lines[blockStart - 1].trim() !== "") blockStart -= 1;

  return [blockStart, blockEnd];
}

function textOf(lines: string[]): string {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Reads one `###` section. Every line is either the section's `<label>` hint, a
 * checkbox alternative, or a bracketed placeholder; anything else is an
 * instruction to whoever fills the form in, which the app phrases itself.
 */
function parseSection(
  title: string,
  lines: string[],
  hints: Record<string, string>,
): CoverPageSection {
  const section: CoverPageSection = {
    title,
    slug: slugify(title),
    label: null,
    options: [],
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

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
      hints[title] = bare[1];
      continue;
    }

    const prefixed = PREFIXED_HINT.exec(line);
    if (prefixed) hints[prefixed[1].trim()] = prefixed[2];
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
 * preamble, a run of `###` fill-in sections, the signing statement, then a
 * signature table followed by the licence attribution. The signing statement
 * has no heading of its own, so it is found as the last paragraph before the
 * table and the final section is read as ending where it begins.
 */
export function parseCoverPage(markdown: string): CoverPageTemplate {
  const lines = toLines(markdown);

  const tableStart = lines.findIndex((line) => TABLE_LINE.test(line));
  if (tableStart === -1) {
    throw new Error("Cover page template has no signature table.");
  }
  let tableEnd = tableStart;
  while (tableEnd + 1 < lines.length && TABLE_LINE.test(lines[tableEnd + 1])) {
    tableEnd += 1;
  }

  const heading = findTitle(lines);
  const usingIndex = lines.findIndex((line) => line.startsWith("## "));
  if (!heading || usingIndex === -1) {
    throw new Error("Cover page template is missing its title or preamble.");
  }

  const sectionStarts: number[] = [];
  for (let i = usingIndex; i < tableStart; i += 1) {
    if (lines[i].startsWith("### ")) sectionStarts.push(i);
  }
  if (sectionStarts.length === 0) {
    throw new Error("Cover page template has no fill-in sections.");
  }

  const [introStart, introEnd] = lastBlockBefore(lines, tableStart);
  const signatureIntro = textOf(lines.slice(introStart, introEnd));
  if (!SIGNING_STATEMENT.test(signatureIntro)) {
    throw new Error(
      "Cover page template has no signing statement before its signature " +
        'table: expected a paragraph beginning "By signing".',
    );
  }

  const hints: Record<string, string> = {};
  const sections = sectionStarts.map((start, index) =>
    parseSection(
      lines[start].slice(4).trim(),
      lines.slice(start + 1, sectionStarts[index + 1] ?? introStart),
      hints,
    ),
  );

  const { partyHeadings, rows } = parseSignatureTable(
    lines.slice(tableStart, tableEnd + 1).map((line) => line.trim()),
  );

  return {
    title: heading.title,
    usingHeading: lines[usingIndex].slice(3).trim(),
    usingBodyHtml: inlineHtml(
      textOf(lines.slice(usingIndex + 1, sectionStarts[0])),
    ),
    sections,
    hints,
    signatureIntro,
    partyHeadings,
    signatureRows: rows,
    attributionHtml: inlineHtml(textOf(lines.slice(tableEnd + 1))),
  };
}
