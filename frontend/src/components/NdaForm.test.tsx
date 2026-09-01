import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import NdaForm from "@/components/NdaForm";
import { loadMndaTemplate } from "@/lib/mnda/source";
import { emptyValues, type NdaValues } from "@/lib/mnda/values";

const { coverPage } = loadMndaTemplate();

function renderForm(values: NdaValues = emptyValues) {
  const onChange = vi.fn();
  const onPartyChange = vi.fn();
  render(
    <NdaForm
      template={coverPage}
      values={values}
      onChange={onChange}
      onPartyChange={onPartyChange}
    />,
  );
  return { onChange, onPartyChange };
}

describe("NdaForm", () => {
  it("takes its placeholders from the template, not from hardcoded copy", () => {
    renderForm();
    expect(screen.getByLabelText("Governing law")).toHaveAttribute(
      "placeholder",
      "Fill in state",
    );
    expect(screen.getByLabelText("Jurisdiction")).toHaveAttribute(
      "placeholder",
      expect.stringContaining("Fill in city or county"),
    );
    expect(screen.getByLabelText("Purpose")).toHaveAttribute(
      "placeholder",
      expect.stringContaining("Evaluating whether"),
    );
  });

  it("explains each field with the template's own help text", () => {
    renderForm();
    expect(
      screen.getByText("How Confidential Information may be used"),
    ).toBeInTheDocument();
    expect(screen.getByText("The length of this MNDA")).toBeInTheDocument();
    // One per party.
    expect(
      screen.getAllByText("Use either email or postal address"),
    ).toHaveLength(2);
  });

  it("names the party sections after the template's columns", () => {
    renderForm();
    expect(
      screen.getByRole("heading", { name: "PARTY 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "PARTY 2" }),
    ).toBeInTheDocument();
  });

  it("reports a typed answer to its parent", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    await user.type(screen.getByLabelText("Governing law"), "D");
    expect(onChange).toHaveBeenCalledWith({ governingLaw: "D" });
  });

  it("reports a party answer against the right party", async () => {
    const user = userEvent.setup();
    const { onPartyChange } = renderForm();
    const [, secondCompany] = screen.getAllByLabelText("Company");
    await user.type(secondCompany, "G");
    expect(onPartyChange).toHaveBeenCalledWith("party2", { company: "G" });
  });

  it("switches a duration to its open-ended alternative", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    await user.click(screen.getByLabelText("Continues until terminated"));
    expect(onChange).toHaveBeenCalledWith({ termMode: "until-terminated" });
  });

  it("disables the years input when the duration is open-ended", () => {
    renderForm({
      ...emptyValues,
      termMode: "until-terminated",
      confidentialityMode: "perpetuity",
    });
    expect(screen.getByLabelText("MNDA term in years")).toBeDisabled();
    expect(
      screen.getByLabelText("Term of confidentiality in years"),
    ).toBeDisabled();
  });

  it("keeps the years input enabled for a fixed term", () => {
    renderForm();
    expect(screen.getByLabelText("MNDA term in years")).toBeEnabled();
  });

  it("commits a retyped number of years", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const years = screen.getByLabelText("MNDA term in years");

    await user.clear(years);
    await user.type(years, "5");

    expect(onChange).toHaveBeenLastCalledWith({ termYears: 5 });
  });

  // Coercing these to a number as they are typed is what used to make the
  // field impossible to retype.
  it("commits nothing for a cleared or zeroed field", async () => {
    const user = userEvent.setup();
    const { onChange } = renderForm();
    const years = screen.getByLabelText("MNDA term in years");

    await user.clear(years);
    expect(onChange).not.toHaveBeenCalled();

    await user.type(years, "0");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("settles back to the committed value when it loses focus", async () => {
    const user = userEvent.setup();
    renderForm();
    const years = screen.getByLabelText("MNDA term in years");

    await user.clear(years);
    expect(years).toHaveValue(null);

    await user.tab();
    expect(years).toHaveValue(1);
  });
});
