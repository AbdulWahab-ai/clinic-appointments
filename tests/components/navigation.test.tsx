import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { StaffNav } from "@/components/staff-nav";
import { renderWithIntl } from "@tests/helpers/render";

const nav = vi.hoisted(() => ({
  pathname: "/app/shifa-family",
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: string;
    locale?: string;
    children: ReactNode;
  }) => (
    <a href={locale ? `/${locale}${href}` : href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push, refresh: nav.refresh }),
}));

const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: auth }));

beforeEach(() => {
  nav.pathname = "/app/shifa-family";
  search.value = "";
});

describe("StaffNav", () => {
  it("lists the staff sections in order", () => {
    renderWithIntl(<StaffNav clinicSlug="shifa-family" />);
    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual([
      "Today",
      "Calendar",
      "Queue",
      "Patients",
      "Settings",
    ]);
  });

  it("marks Today as current only on the clinic root", () => {
    renderWithIntl(<StaffNav clinicSlug="shifa-family" />);
    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Queue" })).not.toHaveAttribute("aria-current");
  });

  it("marks nested pages under their section", () => {
    nav.pathname = "/app/shifa-family/queue/tv";
    renderWithIntl(<StaffNav clinicSlug="shifa-family" />);
    expect(screen.getByRole("link", { name: "Queue" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Today" })).not.toHaveAttribute("aria-current");
  });

  it("links to the clinic's own sections", () => {
    renderWithIntl(<StaffNav clinicSlug="al-noor" />);
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/app/al-noor/calendar",
    );
  });

  it("is labelled for screen readers and translated in Urdu", () => {
    renderWithIntl(<StaffNav clinicSlug="shifa-family" />, "ur");
    expect(screen.getByRole("navigation", { name: "Staff" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "قطار" })).toBeInTheDocument();
  });
});

describe("LocaleSwitcher", () => {
  it("offers Urdu on English pages, written in Urdu", () => {
    nav.pathname = "/sign-in";
    renderWithIntl(<LocaleSwitcher />, "en");
    const link = screen.getByRole("link", { name: "اردو" });
    expect(link).toHaveAttribute("href", "/ur/sign-in");
    expect(link).toHaveAttribute("lang", "ur");
  });

  it("offers English on Urdu pages", () => {
    nav.pathname = "/";
    renderWithIntl(<LocaleSwitcher />, "ur");
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute("lang", "en");
  });

  it("keeps the query string when switching", () => {
    nav.pathname = "/sign-in";
    search.value = "next=%2Fen%2Fapp";
    renderWithIntl(<LocaleSwitcher />, "en");
    expect(screen.getByRole("link", { name: "اردو" })).toHaveAttribute(
      "href",
      "/ur/sign-in?next=%2Fen%2Fapp",
    );
  });
});

describe("SignOutButton", () => {
  it("signs out, then sends the user to sign-in and refreshes server data", async () => {
    auth.signOut.mockResolvedValue({ data: {}, error: null });
    const user = userEvent.setup();
    renderWithIntl(<SignOutButton />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(auth.signOut).toHaveBeenCalled();
    expect(nav.push).toHaveBeenCalledWith("/sign-in");
    expect(nav.refresh).toHaveBeenCalled();
  });
});
