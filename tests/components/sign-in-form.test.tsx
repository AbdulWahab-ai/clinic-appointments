import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "@/app/[locale]/sign-in/sign-in-form";
import { renderWithIntl } from "@tests/helpers/render";

const auth = vi.hoisted(() => ({
  signIn: { email: vi.fn() },
  phoneNumber: { sendOtp: vi.fn(), verify: vi.fn() },
}));
vi.mock("@/lib/auth-client", () => ({ authClient: auth }));

const ok = { data: {}, error: null };
const fail = (status: number) => ({ data: null, error: { status, message: "x" } });

function setup(locale: "en" | "ur" = "en") {
  const user = userEvent.setup();
  renderWithIntl(<SignInForm next="/en/app" />, locale);
  return user;
}

beforeEach(() => {
  auth.signIn.email.mockResolvedValue(ok);
  auth.phoneNumber.sendOtp.mockResolvedValue(ok);
  auth.phoneNumber.verify.mockResolvedValue(ok);
});

describe("SignInForm: email", () => {
  it("signs in and goes to the next page", async () => {
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "admin@shifa.test");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(auth.signIn.email).toHaveBeenCalledWith({
      email: "admin@shifa.test",
      password: "secret-password",
    });
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/en/app"));
  });

  it("explains a wrong password", async () => {
    auth.signIn.email.mockResolvedValue(fail(401));
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "admin@shifa.test");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("don't match");
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("leaves navigation to the 2FA screen when the account has 2FA", async () => {
    auth.signIn.email.mockResolvedValue({ data: { twoFactorRedirect: true }, error: null });
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "admin@shifa.test");
    await user.type(screen.getByLabelText("Password"), "secret-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(auth.signIn.email).toHaveBeenCalled());
    expect(window.location.assign).not.toHaveBeenCalled();
  });

  it("tells the user to wait when rate limited", async () => {
    auth.signIn.email.mockResolvedValue(fail(429));
    const user = setup();
    await user.type(screen.getByLabelText("Email"), "a@b.test");
    await user.type(screen.getByLabelText("Password"), "x");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts");
  });

  it("keeps email and password fields left-to-right", () => {
    setup("ur");
    expect(screen.getByLabelText("ای میل")).toHaveAttribute("dir", "ltr");
    expect(screen.getByLabelText("پاس ورڈ")).toHaveAttribute("dir", "ltr");
  });
});

describe("SignInForm: phone OTP", () => {
  async function openPhoneTab() {
    const user = setup();
    await user.click(screen.getByRole("tab", { name: "Phone" }));
    return user;
  }

  it("marks the selected tab", async () => {
    await openPhoneTab();
    expect(screen.getByRole("tab", { name: "Phone" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Email" })).toHaveAttribute("aria-selected", "false");
  });

  it("rejects a non-Pakistani-format number without calling the server", async () => {
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "12345");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pakistani mobile number");
    expect(auth.phoneNumber.sendOtp).not.toHaveBeenCalled();
  });

  it("normalizes the number, sends a code and shows a masked confirmation", async () => {
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "0300 1234567");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(auth.phoneNumber.sendOtp).toHaveBeenCalledWith({ phoneNumber: "+923001234567" });
    expect(await screen.findByText(/We sent a code to \+92 300 \*\*\*4567/)).toBeInTheDocument();
    expect(screen.queryByText(/1234567/)).not.toBeInTheDocument();
  });

  it("verifies the code and signs in", async () => {
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "03001234567");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));
    expect(auth.phoneNumber.verify).toHaveBeenCalledWith({
      phoneNumber: "+923001234567",
      code: "123456",
    });
    await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith("/en/app"));
  });

  it("explains a wrong or expired code", async () => {
    auth.phoneNumber.verify.mockResolvedValue(fail(400));
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "03001234567");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await user.type(await screen.findByLabelText("6-digit code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("wrong or has expired");
  });

  it("shows a rate-limit message when sending codes too often", async () => {
    auth.phoneNumber.sendOtp.mockResolvedValue(fail(429));
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "03001234567");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts");
  });

  it("clears the error when switching tabs", async () => {
    const user = await openPhoneTab();
    await user.type(screen.getByLabelText("Mobile number"), "1");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("tab", { name: "Email" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
