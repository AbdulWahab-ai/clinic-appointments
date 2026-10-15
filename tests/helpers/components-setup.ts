import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom doesn't implement navigation; components that do full-page redirects call this.
Object.defineProperty(window, "location", {
  configurable: true,
  value: {
    ...window.location,
    assign: vi.fn(),
    href: "http://localhost/en/sign-in",
    search: "",
    pathname: "/en/sign-in",
  },
});
