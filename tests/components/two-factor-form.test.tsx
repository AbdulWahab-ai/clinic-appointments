import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TwoFactorForm } from "@/app/[locale]/sign-in/two-factor/two-factor-form";
import { renderWithIntl } from "@tests/helpers/render";

const auth = vi.hoisted(() => ({ twoFactor: { verifyTotp: vi.fn() } }));
vi.mock("@/lib/auth-client", () => ({ authClient: auth }));

describe("TwoFactorForm", () => {
  it("verifies the TOTP code and continues", async () => {
    auth.twoFactor.verifyTotp.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    renderWithIntl(<TwoFactorForm next="/en/app/shifa-family" />);
    await user.type(screen.getByLabelText("6-digit code"), "654321");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(auth.twoFactor.verifyTotp).toHaveBeenCalledWith({ code: "654321" });
    await waitFor(() =>
      expect(window.location.assign).toHaveBeenCalledWith("/en/app/shifa-family"),
    );
  });

  it("shows an error for a wrong code and stays on the page", async () => {
    auth.twoFactor.verifyTotp.mockResolvedValue({ data: null, error: { status: 401 } });
    const user = userEvent.setup();
    renderWithIntl(<TwoFactorForm next="/en/app" />);
    await user.type(screen.getByLabelText("6-digit code"), "111111");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("wrong or has expired");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("uses a numeric one-time-code input", () => {
    renderWithIntl(<TwoFactorForm next="/en/app" />);
    const input = screen.getByLabelText("6-digit code");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveAttribute("maxlength", "6");
  });
});
