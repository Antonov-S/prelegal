import { describe, expect, it } from "vitest";

import { loadMndaTemplate } from "./source";
import { parseStandardTerms } from "./standardTerms";

describe("parseStandardTerms", () => {
  it("takes the title from the first heading and leaves it out of the body", () => {
    const { title, bodyHtml } = parseStandardTerms(
      ["# Standard Terms", "", "1. **One**. Body."].join("\r\n"),
    );
    expect(title).toBe("Standard Terms");
    expect(bodyHtml).not.toContain("<h1");
  });

  it("renders markdown, including ordered clauses and emphasis", () => {
    const { bodyHtml } = parseStandardTerms(
      ["# T", "", "1. **One**. Body.", "", "2. **Two**. Body."].join("\n"),
    );
    expect(bodyHtml).toContain("<ol");
    expect(bodyHtml).toContain("<strong>One</strong>");
  });

  // The markers are the seams the client fills in; losing them would silently
  // leave the agreement referring to a cover page instead of to real values.
  it("preserves the cover-page cross-reference markers", () => {
    const { bodyHtml } = parseStandardTerms(
      ['# T', "", '1. Use for the <span class="coverpage_link">Purpose</span>.'].join(
        "\n",
      ),
    );
    expect(bodyHtml).toContain('<span class="coverpage_link">Purpose</span>');
  });

  it("rejects a template with no title", () => {
    expect(() => parseStandardTerms("no heading here")).toThrow(/title/i);
  });
});

describe("the repository's Standard Terms", () => {
  const { standardTerms } = loadMndaTemplate();

  it("parses into a titled body of numbered clauses", () => {
    expect(standardTerms.title).toBe("Standard Terms");
    expect(standardTerms.bodyHtml).toContain("<ol");
    expect(standardTerms.bodyHtml).toContain("<li>");
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
