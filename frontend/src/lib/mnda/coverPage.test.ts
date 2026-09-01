import { describe, expect, it } from "vitest";

import { parseCoverPage, slugify } from "./coverPage";
import { loadMndaTemplate } from "./source";

/**
 * A stand-in cover page exercising every shape the parser handles, written with
 * CRLF line endings because the real templates use them.
 */
const FIXTURE = [
  "# Test Agreement",
  "",
  "## USING THIS AGREEMENT",
  "",
  "Intro **paragraph** with a [link](https://example.com).",
  "",
  "### Purpose",
  "<label>Why</label>",
  "",
  "[Some default purpose]",
  "",
  "### Choice Field",
  "<label>Pick one</label>",
  "- [x]     First option [1 year(s)] long.",
  "- [ ]     Second option.",
  "",
  "### Two Fields",
  "Alpha: [Fill in alpha]",
  "",
  "Beta: [Fill in beta]",
  "",
  "### Last Section",
  "Prose that belongs to the section.",
  "",
  "By signing this Cover Page, the parties agree.",
  "",
  "|| SIDE A | SIDE B |",
  "|:--- | :----: | :----: |",
  "| Signature | | |",
  "| Print Name | |",
  "| Notice Address <label>Email or postal</label> | | |",
  "",
  "Attribution [CC BY 4.0](https://example.com/licence).",
].join("\r\n");

describe("slugify", () => {
  it("turns a heading into a stable identifier", () => {
    expect(slugify("Term of Confidentiality")).toBe("term-of-confidentiality");
    expect(slugify("Governing Law & Jurisdiction")).toBe(
      "governing-law-jurisdiction",
    );
  });
});

describe("parseCoverPage", () => {
  const template = parseCoverPage(FIXTURE);

  it("reads the title and the preamble as inline HTML", () => {
    expect(template.title).toBe("Test Agreement");
    expect(template.usingHeading).toBe("USING THIS AGREEMENT");
    expect(template.usingBodyHtml).toContain("<strong>paragraph</strong>");
    expect(template.usingBodyHtml).toContain('href="https://example.com"');
  });

  it("finds every fill-in section, in template order", () => {
    expect(template.sections.map((section) => section.slug)).toEqual([
      "purpose",
      "choice-field",
      "two-fields",
      "last-section",
    ]);
  });

  it("captures the label hint that follows a heading", () => {
    expect(template.sections[0].label).toBe("Why");
    expect(template.sections[1].label).toBe("Pick one");
    expect(template.sections[2].label).toBeNull();
  });

  // Placeholders are collected across the whole template, since every consumer
  // looks them up by name rather than by which section they came from.
  it("keys a bare placeholder by its section title, a labelled one by its prefix", () => {
    expect(template.hints).toEqual({
      Purpose: "Some default purpose",
      Alpha: "Fill in alpha",
      Beta: "Fill in beta",
    });
  });

  it("strips the checkbox from each option, keeping its wording", () => {
    expect(template.sections[1].options).toEqual([
      "First option [1 year(s)] long.",
      "Second option.",
    ]);
  });

  // It sits between the last section and the table with no heading of its own.
  it("reads the signing statement", () => {
    expect(template.signatureIntro).toBe(
      "By signing this Cover Page, the parties agree.",
    );
  });

  it("reads the party columns from the table header", () => {
    expect(template.partyHeadings).toEqual(["SIDE A", "SIDE B"]);
  });

  it("reads the signature rows, skipping the alignment row", () => {
    expect(
      template.signatureRows.map((row) => [row.slug, row.label, row.note]),
    ).toEqual([
      ["signature", "Signature", null],
      ["print-name", "Print Name", null],
      ["notice-address", "Notice Address", "Email or postal"],
    ]);
  });

  it("keeps the attribution that follows the table", () => {
    expect(template.attributionHtml).toContain("Attribution");
    expect(template.attributionHtml).toContain(
      'href="https://example.com/licence"',
    );
  });

  it("rejects a template it cannot make sense of", () => {
    expect(() => parseCoverPage("# Only a title")).toThrow(
      /no signature table/i,
    );
    expect(() =>
      parseCoverPage(["## Heading", "", "| a | b |"].join("\n")),
    ).toThrow(/title or preamble/i);
    expect(() =>
      parseCoverPage(
        ["# Title", "", "## Using", "", "| a | b |"].join("\n"),
      ),
    ).toThrow(/no fill-in sections/i);
  });

  // Losing this sentence would produce an agreement with no execution clause,
  // so it has to fail rather than render without one.
  it("rejects a template whose signing statement has gone missing", () => {
    expect(() =>
      parseCoverPage(FIXTURE.replace(/^By signing.*$/m, "Some other closing.")),
    ).toThrow(/signing statement/i);
  });
});

describe("the repository's Mutual NDA cover page", () => {
  const { coverPage } = loadMndaTemplate();

  it("parses into the six fields the form collects", () => {
    expect(coverPage.title).toBe("Mutual Non-Disclosure Agreement");
    expect(coverPage.sections.map((section) => section.slug)).toEqual([
      "purpose",
      "effective-date",
      "mnda-term",
      "term-of-confidentiality",
      "governing-law-jurisdiction",
      "mnda-modifications",
    ]);
  });

  it("gives both duration sections two alternatives, the first timed", () => {
    for (const slug of ["mnda-term", "term-of-confidentiality"]) {
      const section = coverPage.sections.find((s) => s.slug === slug)!;
      expect(section.options).toHaveLength(2);
      expect(section.options[0]).toMatch(/\[.*year\(s\).*\]/);
    }
  });

  it("carries the placeholders the form uses", () => {
    expect(coverPage.hints["Governing Law"]).toBe("Fill in state");
    expect(coverPage.hints["Jurisdiction"]).toMatch(/^Fill in city or county/);
    expect(coverPage.hints.Purpose).toMatch(/^Evaluating whether/);
  });

  it("has two parties and a six-row signature block", () => {
    expect(coverPage.partyHeadings).toEqual(["PARTY 1", "PARTY 2"]);
    expect(coverPage.signatureRows.map((row) => row.slug)).toEqual([
      "signature",
      "print-name",
      "title",
      "company",
      "notice-address",
      "date",
    ]);
  });

  it("reads the signing statement", () => {
    expect(coverPage.signatureIntro).toMatch(/^By signing this Cover Page/);
  });

  it("retains the CC BY attribution", () => {
    expect(coverPage.attributionHtml).toContain("Common Paper");
    expect(coverPage.attributionHtml).toContain("creativecommons.org");
  });
});
