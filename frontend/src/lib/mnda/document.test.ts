import { describe, expect, it } from "vitest";

import {
  applyYears,
  coverPageLinkValues,
  fillCoverPageLinks,
  formatEffectiveDate,
  formatYears,
  hintFor,
} from "./document";
import { loadMndaTemplate } from "./source";
import { emptyValues, type NdaValues } from "./values";

const { coverPage } = loadMndaTemplate();

const filled: NdaValues = {
  ...emptyValues,
  purpose: "Evaluating a partnership",
  effectiveDate: "2026-03-01",
  term: { fixed: true, years: 2 },
  confidentiality: { fixed: true, years: 5 },
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
};

describe("formatYears", () => {
  it("pluralises", () => {
    expect(formatYears(1)).toBe("1 year");
    expect(formatYears(2)).toBe("2 years");
  });
});

describe("formatEffectiveDate", () => {
  it("writes an ISO date out in full", () => {
    expect(formatEffectiveDate("2026-03-01")).toBe("March 1, 2026");
    expect(formatEffectiveDate("2026-12-31")).toBe("December 31, 2026");
  });

  // Parsing "2026-01-01" with Date() would read it as UTC and could show the
  // previous day west of Greenwich.
  it("keeps the day the user picked, whatever the time zone", () => {
    expect(formatEffectiveDate("2026-01-01")).toContain("January 1");
  });

  // new Date(y, m, d) maps years 0-99 onto 1900-1999, and a date input will
  // hand over "0025-03-01" if someone types a two-digit year.
  it("does not push a two-digit year into the twentieth century", () => {
    expect(formatEffectiveDate("0025-03-01")).toBe("March 1, 25");
    expect(formatEffectiveDate("0099-01-01")).toBe("January 1, 99");
  });

  it("returns nothing for an unset or malformed date", () => {
    expect(formatEffectiveDate("")).toBe("");
    expect(formatEffectiveDate("01/03/2026")).toBe("");
    expect(formatEffectiveDate("2026-3-1")).toBe("");
  });
});

describe("hintFor", () => {
  it("finds a placeholder wherever in the template it was written", () => {
    expect(hintFor(coverPage, "Governing Law")).toBe("Fill in state");
    expect(hintFor(coverPage, "Purpose")).toMatch(/^Evaluating whether/);
  });

  it("falls back to the key itself when there is no placeholder", () => {
    expect(hintFor(coverPage, "Nonexistent")).toBe("Nonexistent");
  });
});

describe("applyYears", () => {
  it("substitutes the chosen duration into an option", () => {
    expect(applyYears("Expires [1 year(s)] from Effective Date.", 2)).toBe(
      "Expires 2 years from Effective Date.",
    );
    expect(applyYears("Expires [1 year(s)] from Effective Date.", 1)).toBe(
      "Expires 1 year from Effective Date.",
    );
  });

  it("replaces only the first placeholder", () => {
    expect(applyYears("[a] then [b]", 3)).toBe("3 years then [b]");
  });

  it("leaves an option with no placeholder alone", () => {
    expect(applyYears("In perpetuity.", 4)).toBe("In perpetuity.");
  });
});

describe("coverPageLinkValues", () => {
  it("phrases each answer to read inside the clause that cites it", () => {
    const fields = coverPageLinkValues(coverPage, filled);
    expect(fields.Purpose.text).toBe("Evaluating a partnership");
    expect(fields["Effective Date"].text).toBe("March 1, 2026");
    expect(fields["MNDA Term"].text).toBe("2-year term");
    expect(fields["Term of Confidentiality"].text).toBe(
      "5-year term of confidentiality",
    );
    expect(fields["Governing Law"].text).toBe("Delaware");
    expect(fields.Jurisdiction.text).toBe("New Castle, DE");
  });

  it("phrases the open-ended alternatives", () => {
    const fields = coverPageLinkValues(coverPage, {
      ...filled,
      term: { fixed: false, years: 2 },
      confidentiality: { fixed: false, years: 5 },
    });
    expect(fields["MNDA Term"].text).toBe(
      "term, which continues until terminated",
    );
    expect(fields["Term of Confidentiality"].text).toBe(
      "perpetual term of confidentiality",
    );
  });

  it("falls back to the template's own hint for an unanswered field", () => {
    const fields = coverPageLinkValues(coverPage, emptyValues);
    expect(fields["Governing Law"]).toEqual({
      text: "[Fill in state]",
      filled: false,
    });
    expect(fields.Purpose.filled).toBe(false);
    expect(fields["Effective Date"].text).toBe("[Today’s date]");
  });

  it("treats whitespace as unanswered, and trims what it keeps", () => {
    const fields = coverPageLinkValues(coverPage, {
      ...filled,
      governingLaw: "   ",
      jurisdiction: "  New Castle, DE  ",
    });
    expect(fields["Governing Law"].filled).toBe(false);
    expect(fields.Jurisdiction.text).toBe("New Castle, DE");
  });

  // No duration is assumed: until one is chosen it reads as unanswered.
  it("counts unchosen durations as unanswered", () => {
    const fields = coverPageLinkValues(coverPage, emptyValues);
    expect(fields["MNDA Term"]).toEqual({ text: "[MNDA Term]", filled: false });
    expect(fields["Term of Confidentiality"]).toEqual({
      text: "[Term of Confidentiality]",
      filled: false,
    });
  });
});

describe("fillCoverPageLinks", () => {
  const fields = coverPageLinkValues(coverPage, filled);

  it("replaces every marker with the matching answer", () => {
    const html = fillCoverPageLinks(
      '<p>laws of the State of <span class="coverpage_link">Governing Law</span></p>',
      fields,
    );
    expect(html).toBe(
      '<p>laws of the State of <span class="mnda-value">Delaware</span></p>',
    );
  });

  it("marks an unanswered field so the document can grey it out", () => {
    const html = fillCoverPageLinks(
      '<span class="coverpage_link">Governing Law</span>',
      coverPageLinkValues(coverPage, emptyValues),
    );
    expect(html).toBe(
      '<span class="mnda-value mnda-unfilled">[Fill in state]</span>',
    );
  });

  it("leaves a marker it has no answer for untouched", () => {
    const marker = '<span class="coverpage_link">Unknown Field</span>';
    expect(fillCoverPageLinks(marker, fields)).toBe(marker);
  });

  // The result goes through dangerouslySetInnerHTML, so anything the user typed
  // has to arrive as text.
  it("escapes markup in a user's answer", () => {
    const html = fillCoverPageLinks(
      '<span class="coverpage_link">Governing Law</span>',
      coverPageLinkValues(coverPage, {
        ...filled,
        governingLaw: '<img src=x onerror="alert(1)">',
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("fills the whole agreement, leaving no marker behind", () => {
    const { standardTerms } = loadMndaTemplate();
    const html = fillCoverPageLinks(standardTerms.bodyHtml, fields);
    expect(html).not.toContain("coverpage_link");
    expect(html).toContain(
      'expires at the end of the <span class="mnda-value">2-year term</span>',
    );
    expect(html).toContain(
      'laws of the State of <span class="mnda-value">Delaware</span>',
    );
  });

  // The terms cite "the Effective Date" and "the Purpose"; a date or a
  // purpose phrase in their place takes no article.
  it("drops the article before the effective date and the purpose", () => {
    const { standardTerms } = loadMndaTemplate();
    const html = fillCoverPageLinks(standardTerms.bodyHtml, fields);
    expect(html).toContain(
      'commences on <span class="mnda-value">March 1, 2026</span>',
    );
    expect(html).toContain(
      'solely for <span class="mnda-value">Evaluating a partnership</span>',
    );
    expect(html).not.toMatch(
      /the <span class="mnda-value">(March 1, 2026|Evaluating a partnership)/,
    );
  });
});
