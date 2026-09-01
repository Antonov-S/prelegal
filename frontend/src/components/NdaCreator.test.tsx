import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import NdaCreator from "@/components/NdaCreator";
import { loadMndaTemplate } from "@/lib/mnda/source";

const template = loadMndaTemplate();

function renderApp() {
  render(<NdaCreator template={template} />);
  return {
    user: userEvent.setup(),
    document: () => screen.getByRole("article"),
  };
}

describe("filling in the form", () => {
  it("writes what is typed into the document", async () => {
    const { user, document } = renderApp();

    await user.type(screen.getByLabelText("Governing law"), "Delaware");

    // Once on the cover page, twice more where section 9 cites it.
    expect(within(document()).getAllByText("Delaware")).toHaveLength(3);
    expect(within(document()).queryByText("[Fill in state]")).toBeNull();
  });

  it("replaces a cleared answer with the template's placeholder again", async () => {
    const { user, document } = renderApp();
    const governingLaw = screen.getByLabelText("Governing law");

    await user.type(governingLaw, "Delaware");
    await user.clear(governingLaw);

    expect(within(document()).getAllByText("[Fill in state]")).toHaveLength(3);
  });

  it("formats a picked date for the document", async () => {
    const { document } = renderApp();

    const date = screen.getByLabelText("Effective date");
    await userEvent.setup().type(date, "2026-03-01");

    expect(within(document()).getAllByText("March 1, 2026")).toHaveLength(2);
  });

  it("moves the tick when a duration alternative is chosen", async () => {
    const { user, document } = renderApp();

    await user.click(screen.getByLabelText("In perpetuity"));

    const chosen = within(document())
      .getByText(/^In perpetuity/)
      .closest("li")!;
    expect(chosen.textContent).toContain("☒");
    expect(within(document()).getByText(/perpetual term of confidentiality/))
      .toBeInTheDocument();
  });

  it("carries a changed term through to the clause that cites it", async () => {
    const { user, document } = renderApp();

    const years = screen.getByLabelText("Expires after, in years");
    await user.clear(years);
    await user.type(years, "3");

    expect(
      within(document()).getByText(/^Expires 3 years from Effective Date/),
    ).toBeInTheDocument();
    expect(
      within(document()).getByText("3-year term"),
    ).toBeInTheDocument();
  });

  it("puts each party's details in their own column", async () => {
    const { user, document } = renderApp();

    const [firstCompany, secondCompany] = screen.getAllByLabelText("Company");
    await user.type(firstCompany, "Acme, Inc.");
    await user.type(secondCompany, "Globex Corp");

    const row = within(document())
      .getByRole("rowheader", { name: /Company/ })
      .closest("tr")!;
    const cells = within(row).getAllByRole("cell");
    expect(cells[0]).toHaveTextContent("Acme, Inc.");
    expect(cells[1]).toHaveTextContent("Globex Corp");
  });

  it("renders a typed answer as text, never as markup", async () => {
    const { user, document } = renderApp();

    await user.type(
      screen.getByLabelText("Governing law"),
      "<img src=x onerror=alert(1)>",
    );

    expect(document().querySelector("img")).toBeNull();
    expect(
      within(document()).getAllByText("<img src=x onerror=alert(1)>").length,
    ).toBeGreaterThan(0);
  });
});

describe("resetting", () => {
  it("clears the form and the document together", async () => {
    const { user, document } = renderApp();

    await user.type(screen.getByLabelText("Governing law"), "Delaware");
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Governing law")).toHaveValue("");
    expect(within(document()).getAllByText("[Fill in state]")).toHaveLength(3);
  });
});

describe("downloading", () => {
  const print = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("print", print);
    window.document.title = "Prelegal — Mutual NDA creator";
  });

  afterEach(() => {
    print.mockClear();
    vi.unstubAllGlobals();
  });

  it("opens the print dialog", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(print).toHaveBeenCalledOnce();
  });

  // Chrome names the saved file after the page title and prints it in its
  // header, so the agreement's name has to stand in for the app's while
  // printing, then give way again.
  it("names the page after the agreement while printing", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(window.document.title).toBe("Mutual Non-Disclosure Agreement");

    window.dispatchEvent(new Event("afterprint"));
    expect(window.document.title).toBe("Prelegal — Mutual NDA creator");
  });

  it("names both companies once they are known", async () => {
    const { user } = renderApp();

    const [firstCompany, secondCompany] = screen.getAllByLabelText("Company");
    await user.type(firstCompany, "Acme, Inc.");
    await user.type(secondCompany, "Globex Corp");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(window.document.title).toBe(
      "Mutual NDA — Acme, Inc. and Globex Corp",
    );
  });

  it("waits for both companies before naming either", async () => {
    const { user } = renderApp();

    const [firstCompany] = screen.getAllByLabelText("Company");
    await user.type(firstCompany, "Acme, Inc.");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(window.document.title).toBe("Mutual Non-Disclosure Agreement");
  });
});
