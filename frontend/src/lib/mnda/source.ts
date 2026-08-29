import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseCoverPage } from "./coverPage";
import { parseStandardTerms } from "./standardTerms";
import type { MndaTemplate } from "./types";

/**
 * The repository's template library, one directory up from this app. Reading it
 * directly keeps `templates/` the single source of truth for the agreement's
 * wording — there is no generated copy to fall out of date.
 */
const TEMPLATES_DIR = join(process.cwd(), "..", "templates");

function read(filename: string): string {
  try {
    return readFileSync(join(TEMPLATES_DIR, filename), "utf8");
  } catch {
    throw new Error(
      `Could not read ${filename} from ${TEMPLATES_DIR}. ` +
        "Run the app from the frontend/ directory of the prelegal repository.",
    );
  }
}

/**
 * Loads and parses the Mutual NDA templates. Called from a server component at
 * module scope, so the files are read once when the page is built.
 */
export function loadMndaTemplate(): MndaTemplate {
  return {
    coverPage: parseCoverPage(read("mutual-nda-coverpage.md")),
    standardTerms: parseStandardTerms(read("mutual-nda.md")),
  };
}
