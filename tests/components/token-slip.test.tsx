import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TokenSlip } from "@/components/token-slip";

describe("TokenSlip", () => {
  it("shows the label and number", () => {
    render(<TokenSlip number={17} label="Your token" />);
    expect(screen.getByText("Your token")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("is announced as one group to screen readers", () => {
    render(<TokenSlip number={17} label="Your token" />);
    expect(screen.getByRole("group", { name: "Your token 17" })).toBeInTheDocument();
  });

  it("switches to the serving state", () => {
    const { rerender } = render(<TokenSlip number={4} label="Now serving" />);
    expect(screen.getByRole("group")).toHaveAttribute("data-state", "waiting");
    rerender(<TokenSlip number={4} label="Now serving" serving />);
    expect(screen.getByRole("group")).toHaveAttribute("data-state", "serving");
  });

  it("accepts string tokens such as A-12", () => {
    render(<TokenSlip number="A-12" label="Token" />);
    expect(screen.getByText("A-12")).toBeInTheDocument();
  });
});
