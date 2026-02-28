import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner, spinnerVariants } from "@/components/ui/spinner";

// Mock Loader2 component
vi.mock("lucide-react", () => ({
  Loader2: ({ className }: { className?: string }) => (
    <svg data-testid="mock-loader" className={className} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
}));

describe("Spinner", () => {
  describe("Sizes", () => {
    it("renders sm size with correct classes", () => {
      render(<Spinner size="sm" />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("h-4");
      expect(screen.getByTestId("mock-loader")).toHaveClass("w-4");
    });

    it("renders default size with correct classes", () => {
      render(<Spinner />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("h-6");
      expect(screen.getByTestId("mock-loader")).toHaveClass("w-6");
    });

    it("renders lg size with correct classes", () => {
      render(<Spinner size="lg" />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("h-8");
      expect(screen.getByTestId("mock-loader")).toHaveClass("w-8");
    });

    it("renders xl size with correct classes", () => {
      render(<Spinner size="xl" />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("h-12");
      expect(screen.getByTestId("mock-loader")).toHaveClass("w-12");
    });
  });

  describe("Colors", () => {
    it("renders primary color by default", () => {
      render(<Spinner />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-primary");
    });

    it("renders secondary color", () => {
      render(<Spinner color="secondary" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-secondary");
    });

    it("renders foreground color", () => {
      render(<Spinner color="foreground" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-foreground");
    });

    it("renders muted color", () => {
      render(<Spinner color="muted" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-muted-foreground");
    });

    it("renders accent color", () => {
      render(<Spinner color="accent" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-accent");
    });

    it("renders destructive color", () => {
      render(<Spinner color="destructive" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner).toHaveClass("text-destructive");
    });
  });

  describe("Custom color", () => {
    it("applies customColor via inline style", () => {
      render(<Spinner customColor="#ff0000" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner.parentElement).toHaveStyle("color: #ff0000");
    });

    it("customColor overrides color variant", () => {
      render(<Spinner color="primary" customColor="#00ff00" />);
      const spinner = screen.getByTestId("mock-loader");
      expect(spinner.parentElement).toHaveStyle("color: #00ff00");
    });
  });

  describe("Animation", () => {
    it("has animate-spin class on parent", () => {
      const { container } = render(<Spinner />);
      const spinner = container.querySelector("[data-testid='mock-loader']");
      expect(spinner.parentElement).toHaveClass("animate-spin");
    });
  });

  describe("Custom className", () => {
    it("accepts custom className on parent", () => {
      const { container } = render(<Spinner className="custom-spinner" />);
      const spinner = container.querySelector("[data-testid='mock-loader']");
      expect(spinner.parentElement).toHaveClass("custom-spinner");
    });
  });

  describe("Style prop", () => {
    it("accepts style prop", () => {
      render(<Spinner style={{ margin: "10px" }} />);
      expect(screen.getByTestId("mock-loader").parentElement).toHaveStyle("margin: 10px");
    });
  });

  describe("Variants function", () => {
    it("exports spinnerVariants for custom usage", () => {
      expect(spinnerVariants).toBeDefined();
      expect(typeof spinnerVariants).toBe("function");
    });
  });

  describe("Display name", () => {
    it("has correct display name", () => {
      expect(Spinner.displayName).toBe("Spinner");
    });
  });

  describe("Loader2 size overrides", () => {
    it("applies correct size to Loader2 for sm", () => {
      render(<Spinner size="sm" />);
      const loader = screen.getByTestId("mock-loader");
      expect(loader).toHaveClass("h-4");
      expect(loader).toHaveClass("w-4");
    });

    it("applies correct size to Loader2 for default", () => {
      render(<Spinner />);
      const loader = screen.getByTestId("mock-loader");
      expect(loader).toHaveClass("h-6");
      expect(loader).toHaveClass("w-6");
    });

    it("applies correct size to Loader2 for lg", () => {
      render(<Spinner size="lg" />);
      const loader = screen.getByTestId("mock-loader");
      expect(loader).toHaveClass("h-8");
      expect(loader).toHaveClass("w-8");
    });

    it("applies correct size to Loader2 for xl", () => {
      render(<Spinner size="xl" />);
      const loader = screen.getByTestId("mock-loader");
      expect(loader).toHaveClass("h-12");
      expect(loader).toHaveClass("w-12");
    });
  });

  describe("Default variants", () => {
    it("has default size of default", () => {
      render(<Spinner />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("h-6");
      expect(screen.getByTestId("mock-loader")).toHaveClass("w-6");
    });

    it("has default color of primary", () => {
      render(<Spinner />);
      expect(screen.getByTestId("mock-loader")).toHaveClass("text-primary");
    });
  });
});
