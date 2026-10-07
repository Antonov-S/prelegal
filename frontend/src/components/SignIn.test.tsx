import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SignIn from "@/components/SignIn";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockReset());

describe("the placeholder sign-in", () => {
  it("enters the application once both fields are filled in", async () => {
    const user = userEvent.setup();
    render(<SignIn />);

    await user.type(screen.getByLabelText("Email"), "jo@example.com");
    await user.type(screen.getByLabelText("Password"), "anything");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(push).toHaveBeenCalledExactlyOnceWith("/nda/");
  });

  it("does not submit while a field is empty", async () => {
    const user = userEvent.setup();
    render(<SignIn />);

    await user.type(screen.getByLabelText("Email"), "jo@example.com");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(push).not.toHaveBeenCalled();
  });
});
