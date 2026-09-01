import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { parseCoverPage } from "./coverPage";
import { parseStandardTerms } from "./standardTerms";
import type { CoverPageTemplate, MndaTemplate } from "./types";

const COVER_PAGE_FILE = "mutual-nda-coverpage.md";
const STANDARD_TERMS_FILE = "mutual-nda.md";

/**
 * The cover-page sections this app knows how to render. `NdaDocument`
 * dispatches on these slugs, so a template that no longer carries one of them
 * would render that section as an empty row while the Standard Terms went on
 * citing it — a cover page contradicting its own agreement.
 */
const REQUIRED_SECTIONS = [
  "purpose",
  "effective-date",
  "mnda-term",
  "term-of-confidentiality",
  "governing-law-jurisdiction",
  "mnda-modifications",
] as const;

const PARTY_COUNT = 2;

/**
 * The repository's template library. Resolved by walking up from the working
 * directory rather than assumed to be one level up, so a build started from the
 * repository root — or from anywhere else above this package — finds it too.
 */
function templatesDir(): string {
  let directory = process.cwd();
  for (;;) {
    const candidate = join(directory, "templates");
    if (existsSync(join(candidate, STANDARD_TERMS_FILE))) return candidate;

    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }

  throw new Error(
    `Could not find a templates/ directory containing ${STANDARD_TERMS_FILE} ` +
      `in ${process.cwd()} or any directory above it. The app reads the ` +
      "agreement's wording from the prelegal repository's templates/.",
  );
}

/**
 * Fails the load — and so the build — rather than let a template this app
 * cannot fully render reach the page. Exported so the contract can be tested
 * without doctoring the files on disk.
 */
export function assertRenderable(coverPage: CoverPageTemplate): void {
  const slugs = new Set(coverPage.sections.map((section) => section.slug));
  const missing = REQUIRED_SECTIONS.filter((slug) => !slugs.has(slug));
  if (missing.length > 0) {
    throw new Error(
      `Cover page template is missing the section(s) this app renders: ` +
        `${missing.join(", ")}. It has: ${[...slugs].join(", ")}.`,
    );
  }

  if (coverPage.partyHeadings.length !== PARTY_COUNT) {
    throw new Error(
      `Cover page template names ${coverPage.partyHeadings.length} parties; ` +
        `this app collects ${PARTY_COUNT}.`,
    );
  }
}

/**
 * Loads and parses the Mutual NDA templates. Called from a server component at
 * module scope, so the files are read once when the page is built.
 */
export function loadMndaTemplate(): MndaTemplate {
  const directory = templatesDir();
  const read = (filename: string) =>
    readFileSync(join(directory, filename), "utf8");

  const coverPage = parseCoverPage(read(COVER_PAGE_FILE));
  assertRenderable(coverPage);

  return {
    coverPage,
    standardTerms: parseStandardTerms(read(STANDARD_TERMS_FILE)),
  };
}
