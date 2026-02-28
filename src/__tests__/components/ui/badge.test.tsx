import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Badge, badgeVariants } from "@/components/ui/badge";

describe("Badge", () => {
  describe("Variants", () => {
    it("renders default variant with correct classes", () => {
      render(<Badge>Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("border-transparent");
      expect(badge).toHaveClass("bg-primary");
      expect(badge).toHaveClass("text-primary-foreground");
    });

    it("renders secondary variant with correct classes", () => {
      render(<Badge variant="secondary">Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("bg-secondary");
      expect(badge).toHaveClass("text-secondary-foreground");
    });

    it("renders destructive variant with correct classes", () => {
      render(<Badge variant="destructive">Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("bg-destructive");
      expect(badge).toHaveClass("text-destructive-foreground");
    });

    it("renders outline variant with correct classes", () => {
      render(<Badge variant="outline">Badge</Badge>);
      const badge = screen.getByText("Badge");
      expect(badge).toHaveClass("text-foreground");
    });

    it("renders success variant with correct classes", () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText("Success");
      expect(badge).toHaveClass("bg-green-500/10");
      expect(badge).toHaveClass("text-green-700");
    });

    it("renders warning variant with correct classes", () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText("Warning");
      expect(badge).toHaveClass("bg-yellow-500/10");
      expect(badge).toHaveClass("text-yellow-700");
    });

    it("renders info variant with correct classes", () => {
      render(<Badge variant="info">Info</Badge>);
      const badge = screen.getByText("Info");
      expect(badge).toHaveClass("bg-blue-500/10");
      expect(badge).toHaveClass("text-blue-700");
    });
  });

  describe("Sizes", () => {
    it("renders sm size with correct classes", () => {
      render(<Badge size="sm">Small</Badge>);
      const badge = screen.getByText("Small");
      expect(badge).toHaveClass("text-[10px]");
      expect(badge).toHaveClass("px-2");
    });

    it("renders default size with correct classes", () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText("Default");
      expect(badge).toHaveClass("text-xs");
      expect(badge).toHaveClass("px-2.5");
    });

    it("renders lg size with correct classes", () => {
      render(<Badge size="lg">Large</Badge>);
      const badge = screen.getByText("Large");
      expect(badge).toHaveClass("text-sm");
      expect(badge).toHaveClass("px-3");
    });
  });

  describe("asChild prop", () => {
    it("renders as Slot component when asChild is true", () => {
      render(
        <Badge asChild>
          <a href="/test">Link</a>
        </Badge>
      );
      const link = screen.getByRole("link", { name: "Link" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });
  });

  describe("Accessibility", () => {
    it("has focus-visible styles", () => {
      render(<Badge>Focus test</Badge>);
      const badge = screen.getByText("Focus test");
      expect(badge).toHaveClass("focus-visible:outline-none");
      expect(badge).toHaveClass("focus-visible:ring-2");
      expect(badge).toHaveClass("focus-visible:ring-ring");
      expect(badge).toHaveClass("focus-visible:ring-offset-2");
    });

    it("has rounded-full class for badge shape", () => {
      render(<Badge>Shape</Badge>);
      const badge = screen.getByText("Shape");
      expect(badge).toHaveClass("rounded-full");
    });
  });

  describe("Event handlers", () => {
    it("calls onClick handler when clicked", () => {
      const handleClick = vi.fn();
      render(<Badge onClick={handleClick}>Click me</Badge>);
      const badge = screen.getByText("Click me");
      fireEvent.click(badge);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Content", () => {
    it("renders children correctly", () => {
      render(<Badge>Test Badge</Badge>);
      expect(screen.getByText("Test Badge")).toBeInTheDocument();
    });

    it("renders React nodes as children", () => {
      render(<Badge><span>React Node</span></Badge>);
      expect(screen.getByText("React Node")).toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("accepts custom className", () => {
      render(<Badge className="custom-badge">Custom</Badge>);
      const badge = screen.getByText("Custom");
      expect(badge).toHaveClass("custom-badge");
    });
  });

  describe("Variants function", () => {
    it("exports badgeVariants for custom usage", () => {
      expect(badgeVariants).toBeDefined();
      expect(typeof badgeVariants).toBe("function");
    });
  });

  describe("Display name", () => {
    it("has correct display name", () => {
      expect(Badge.displayName).toBe("Badge");
    });
  });

  describe("Default variants", () => {
    it("has default variant of default", () => {
      render(<Badge>Default variant</Badge>);
      const badge = screen.getByText("Default variant");
      expect(badge).toHaveClass("bg-primary");
    });

    it("has default size of default", () => {
      render(<Badge>Default size</Badge>);
      const badge = screen.getByText("Default size");
      expect(badge).toHaveClass("text-xs");
    });
  });
});
