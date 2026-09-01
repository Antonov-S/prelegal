import { describe, expect, it } from "vitest";

import { assertRenderable, loadMndaTemplate } from "./source";
import type { CoverPageTemplate } from "./types";

const { coverPage } = loadMndaTemplate();

describe("loadMndaTemplate", () => {
  it("finds the templates from the working directory the tests run in", () => {
    expect(coverPage.title).toBe("Mutual Non-Disclosure Agreement");
  });
});

describe("assertRenderable", () => {
  it("accepts the repository's template", () => {
    expect(() => assertRenderable(coverPage)).not.toThrow();
  });

  // Renaming a heading upstream — "&" to "and", say — changes its slug. Without
  // this check the section would render as an empty row while the Standard
  // Terms went on citing the values it should have carried.
  it("rejects a template whose section this app cannot render", () => {
    const renamed: CoverPageTemplate = {
      ...coverPage,
      sections: coverPage.sections.map((section) =>
        section.slug === "governing-law-jurisdiction"
          ? { ...section, slug: "governing-law-and-jurisdiction" }
          : section,
      ),
    };

    expect(() => assertRenderable(renamed)).toThrow(
      /missing the section\(s\) this app renders: governing-law-jurisdiction/,
    );
  });

  it("names every missing section, and what it found instead", () => {
    expect(() =>
      assertRenderable({ ...coverPage, sections: [] }),
    ).toThrow(/purpose, effective-date, mnda-term/);
  });

  // The signature block renders one column per heading but fills exactly two,
  // so a third would silently misalign every row.
  it("rejects a template that names other than two parties", () => {
    expect(() =>
      assertRenderable({
        ...coverPage,
        partyHeadings: ["PARTY 1", "PARTY 2", "PARTY 3"],
      }),
    ).toThrow(/names 3 parties/);
  });
});
