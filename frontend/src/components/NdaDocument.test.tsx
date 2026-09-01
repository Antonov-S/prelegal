import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NdaDocument from "@/components/NdaDocument";
import { loadMndaTemplate } from "@/lib/mnda/source";
import { emptyValues, type NdaValues } from "@/lib/mnda/values";

const template = loadMndaTemplate();

const filled: NdaValues = {
  ...emptyValues,
  purpose: "Evaluating a partnership",
  effectiveDate: "2026-03-01",
  term: { fixed: true, years: 2 },
  confidentiality: { fixed: true, years: 5 },
  governingLaw: "Delaware",
  jurisdiction: "New Castle, DE",
  modifications: "Section 8 is deleted.",
  party1: {
    company: "Acme, Inc.",
    signatoryName: "Ada Lovelace",
    signatoryTitle: "Chief Executive Officer",
    noticeAddress: "legal@acme.example",
  },
  party2: {
    company: "Globex Corp",
    signatoryName: "Grace Hopper",
    signatoryTitle: "General Counsel",
    noticeAddress: "legal@globex.example",
  },
};

function renderDocument(values: NdaValues) {
  render(
    <NdaDocument
      coverPage={template.coverPage}
      standardTerms={template.standardTerms}
      values={values}
    />,
  );
  return screen.getByRole("article");
}

/** The `li` carrying a given option, so its checkbox glyph can be read. */
function option(article: HTMLElement, text: RegExp) {
  return within(article).getByText(text).closest("li")!;
}

function signatureRow(article: HTMLElement, label: RegExp) {
  return within(article).getByRole("rowheader", { name: label }).closest("tr")!;
}

describe("NdaDocument, before anything is filled in", () => {
  // A placeholder shows once on the cover page and again wherever the Standard
  // Terms cite that field, so every occurrence should be the hint.
  it("shows the template's own placeholder for each unanswered field", () => {
    const article = renderDocument(emptyValues);
    expect(within(article).getAllByText("[Fill in state]")).toHaveLength(3);
    expect(within(article).getAllByText("[Today’s date]")).toHaveLength(2);
    expect(within(article).getAllByText(/^\[Evaluating whether/)).toHaveLength(
      4,
    );
    expect(
      within(article).getAllByText(/^\[Fill in city or county/),
    ).toHaveLength(3);
  });

  it("records no modifications rather than leaving the section empty", () => {
    const article = renderDocument(emptyValues);
    expect(within(article).getByText("None.")).toBeInTheDocument();
  });

  it("starts on the fixed-term alternative in both duration sections", () => {
    const article = renderDocument(emptyValues);
    expect(option(article, /Expires 1 year from/).textContent).toContain("☒");
    expect(option(article, /Continues until terminated/).textContent).toContain(
      "☐",
    );
    expect(option(article, /In perpetuity/).textContent).toContain("☐");
  });
});

describe("NdaDocument, filled in", () => {
  it("writes the answers into the cover page", () => {
    const article = renderDocument(filled);
    expect(
      within(article).getAllByText("Evaluating a partnership").length,
    ).toBeGreaterThan(0);
    expect(within(article).getAllByText("March 1, 2026").length).toBeGreaterThan(
      0,
    );
    expect(within(article).getAllByText("Delaware").length).toBeGreaterThan(0);
    expect(
      within(article).getAllByText("New Castle, DE").length,
    ).toBeGreaterThan(0);
    expect(
      within(article).getByText("Section 8 is deleted."),
    ).toBeInTheDocument();
  });

  it("puts the chosen duration into the option's own wording", () => {
    const article = renderDocument(filled);
    expect(option(article, /Expires 2 years from/).textContent).toContain("☒");
    expect(option(article, /^5 years from Effective Date/).textContent).toContain(
      "☒",
    );
  });

  it("moves the tick when the open-ended alternatives are chosen", () => {
    const article = renderDocument({
      ...filled,
      term: { ...filled.term, fixed: false },
      confidentiality: { ...filled.confidentiality, fixed: false },
    });
    expect(option(article, /Continues until terminated/).textContent).toContain(
      "☒",
    );
    expect(option(article, /Expires 2 years from/).textContent).toContain("☐");
    expect(option(article, /In perpetuity/).textContent).toContain("☒");
  });

  it("fills each party's column of the signature block", () => {
    const article = renderDocument(filled);
    expect(
      within(signatureRow(article, /Company/)).getByText("Acme, Inc."),
    ).toBeInTheDocument();
    expect(
      within(signatureRow(article, /Print Name/)).getByText("Grace Hopper"),
    ).toBeInTheDocument();
    expect(
      within(signatureRow(article, /Notice Address/)).getByText(
        "legal@globex.example",
      ),
    ).toBeInTheDocument();
  });

  it("leaves the rows that are signed by hand empty", () => {
    const article = renderDocument(filled);
    for (const label of [/^Signature/, /^Date/]) {
      const cells = within(signatureRow(article, label)).getAllByRole("cell");
      expect(cells).toHaveLength(2);
      for (const cell of cells) expect(cell).toHaveTextContent("");
    }
  });

  // The glyph is aria-hidden and the only other difference is colour, so
  // without this the two alternatives are indistinguishable to a screen reader.
  it("says which alternative was chosen, in words", () => {
    const article = renderDocument(filled);
    expect(option(article, /Expires 2 years from/).textContent).toContain(
      "Selected:",
    );
    expect(
      option(article, /Continues until terminated/).textContent,
    ).toContain("Not selected:");
  });

  it("names both parties as columns", () => {
    const article = renderDocument(filled);
    expect(
      within(article).getByRole("columnheader", { name: "PARTY 1" }),
    ).toBeInTheDocument();
    expect(
      within(article).getByRole("columnheader", { name: "PARTY 2" }),
    ).toBeInTheDocument();
  });
});

describe("NdaDocument's Standard Terms", () => {
  it("resolves the cross-references to the cover page's answers", () => {
    const article = renderDocument(filled);
    expect(article.innerHTML).not.toContain("coverpage_link");
    expect(article.innerHTML).toContain(
      'expires at the end of the <span class="mnda-value">2-year term</span>',
    );
    expect(article.innerHTML).toContain(
      'laws of the State of <span class="mnda-value">Delaware</span>',
    );
  });

  it("leaves the page a single h1, which the app chrome owns", () => {
    const article = renderDocument(filled);
    expect(within(article).queryByRole("heading", { level: 1 })).toBeNull();
    expect(
      within(article).getByRole("heading", { level: 2, name: article.getAttribute("aria-label")! }),
    ).toBeInTheDocument();
  });

  it("renders the clauses as a list, for the hanging indents to hook", () => {
    const article = renderDocument(filled);
    const clauses = article.querySelectorAll(".mnda-terms ol > li");
    expect(clauses).toHaveLength(11);
  });

  it("keeps the CC BY attribution on both parts of the document", () => {
    const article = renderDocument(filled);
    expect(
      within(article).getAllByText(/free to use under/).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
