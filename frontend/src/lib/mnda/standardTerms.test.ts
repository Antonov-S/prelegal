import { describe, expect, it } from "vitest";

import { loadMndaTemplate } from "./source";
import { parseStandardTerms } from "./standardTerms";

/** The licence line every Common Paper template closes with. */
const ATTRIBUTION =
  "Common Paper Mutual NDA free to use under [CC BY 4.0](https://example.com).";

const template = (...body: string[]) =>
  ["# Standard Terms", "", ...body, "", ATTRIBUTION].join("\r\n");

describe("parseStandardTerms", () => {
  it("takes the title from the first heading and leaves it out of the body", () => {
    const { title, bodyHtml } = parseStandardTerms(
      template("1. **One**. Body."),
    );
    expect(title).toBe("Standard Terms");
    expect(bodyHtml).not.toContain("<h1");
  });

  it("renders markdown, including ordered clauses and emphasis", () => {
    const { bodyHtml } = parseStandardTerms(
      template("1. **One**. Body.", "", "2. **Two**. Body."),
    );
    expect(bodyHtml).toContain("<ol");
    expect(bodyHtml).toContain("<strong>One</strong>");
  });

  // The markers are the seams the client fills in; losing them would silently
  // leave the agreement referring to a cover page instead of to real values.
  it("preserves the cover-page cross-reference markers", () => {
    const { bodyHtml } = parseStandardTerms(
      template('1. Use for the <span class="coverpage_link">Purpose</span>.'),
    );
    expect(bodyHtml).toContain('<span class="coverpage_link">Purpose</span>');
  });

  // Styled as a footer rather than as a clause, so it is lifted out of the body
  // rather than left to a CSS rule betting on it being the last paragraph.
  it("separates the licence attribution from the clauses", () => {
    const { bodyHtml, attributionHtml } = parseStandardTerms(
      template("1. **One**. Body."),
    );
    expect(bodyHtml).not.toContain("free to use under");
    expect(attributionHtml).toContain("free to use under");
    expect(attributionHtml).toContain('href="https://example.com"');
  });

  it("rejects a template with no title", () => {
    expect(() => parseStandardTerms("no heading here")).toThrow(/title/i);
  });

  // CC BY requires the notice to travel with the document.
  it("rejects a template that has lost its attribution", () => {
    expect(() =>
      parseStandardTerms(["# T", "", "1. **One**. Body."].join("\n")),
    ).toThrow(/licence attribution/i);
  });
});

describe("the repository's Standard Terms", () => {
  const { standardTerms } = loadMndaTemplate();

  it("parses into a titled body of numbered clauses", () => {
    expect(standardTerms.title).toBe("Standard Terms");
    expect(standardTerms.bodyHtml).toContain("<ol");
    expect(standardTerms.bodyHtml).toContain("<li>");
  });

  it("keeps the CC BY attribution, out of the clause list", () => {
    expect(standardTerms.attributionHtml).toContain("Common Paper");
    expect(standardTerms.attributionHtml).toContain("creativecommons.org");
    expect(standardTerms.bodyHtml).not.toContain("free to use under");
  });

  it("carries exactly the six cross-references the form answers", () => {
    const markers = [
      ...standardTerms.bodyHtml.matchAll(
        /<span class="coverpage_link">([^<]*)<\/span>/g,
      ),
    ].map((match) => match[1]);

    expect(new Set(markers)).toEqual(
      new Set([
        "Purpose",
        "Effective Date",
        "MNDA Term",
        "Term of Confidentiality",
        "Governing Law",
        "Jurisdiction",
      ]),
    );
    expect(markers).toHaveLength(10);
  });
});
