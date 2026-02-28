import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, buttonVariants } from "@/components/ui/button";

// Mock Loader2 component for isLoading state
vi.mock("lucide-react", () => ({
  Loader2: () => <span data-testid="mock-loader">Loading...</span>,
}));

describe("Button", () => {
  describe("Variants", () => {
    it("renders default variant with correct classes", () => {
      render(<Button variant="default">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("bg-primary");
      expect(button).toHaveClass("text-primary-foreground");
    });

    it("renders secondary variant with correct classes", () => {
      render(<Button variant="secondary">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("bg-secondary");
      expect(button).toHaveClass("text-secondary-foreground");
    });

    it("renders ghost variant with correct classes", () => {
      render(<Button variant="ghost">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("hover:bg-primary/10");
      expect(button).toHaveClass("hover:text-primary");
    });

    it("renders destructive variant with correct classes", () => {
      render(<Button variant="destructive">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("bg-destructive");
      expect(button).toHaveClass("text-destructive-foreground");
    });

    it("renders outline variant with correct classes", () => {
      render(<Button variant="outline">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("border");
      expect(button).toHaveClass("bg-background");
    });

    it("renders link variant with correct classes", () => {
      render(<Button variant="link">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("text-primary");
      expect(button).toHaveClass("underline-offset-4");
      expect(button).toHaveClass("hover:underline");
    });
  });

  describe("Sizes", () => {
    it("renders default size with correct classes", () => {
      render(<Button size="default">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("px-4");
      expect(button).toHaveClass("py-2.5");
      expect(button).toHaveClass("text-sm");
    });

    it("renders sm size with correct classes", () => {
      render(<Button size="sm">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("px-3");
      expect(button).toHaveClass("py-1.5");
      expect(button).toHaveClass("text-xs");
    });

    it("renders lg size with correct classes", () => {
      render(<Button size="lg">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("px-6");
      expect(button).toHaveClass("py-3");
      expect(button).toHaveClass("text-base");
    });

    it("renders icon size with correct classes", () => {
      render(<Button size="icon">icon</Button>);
      const button = screen.getByText("icon");
      expect(button).toHaveClass("h-10");
      expect(button).toHaveClass("w-10");
    });
  });

  describe("isLoading state", () => {
    it("shows loader when isLoading is true", () => {
      render(<Button isLoading>Click me</Button>);
      expect(screen.getByTestId("mock-loader")).toBeInTheDocument();
    });

    it("disables button when isLoading is true", () => {
      const { container } = render(<Button isLoading>Click me</Button>);
      const button = container.querySelector("button");
      expect(button).toBeDisabled();
    });

    it("does not show loader when isLoading is false", () => {
      render(<Button isLoading={false}>Click me</Button>);
      expect(screen.queryByTestId("mock-loader")).not.toBeInTheDocument();
    });
  });

  describe("asChild prop", () => {
    it("renders as Slot component when asChild is true", () => {
      const { container } = render(
        <Button asChild>
          <a href="/test">Click me</a>
        </Button>
      );
      const link = container.querySelector("a");
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/test");
    });

    it("passes through className when asChild is true", () => {
      const { container } = render(
        <Button asChild className="custom-button">
          <a href="/test">Click me</a>
        </Button>
      );
      const link = container.querySelector("a");
      expect(link).toHaveClass("custom-button");
    });
  });

  describe("Accessibility", () => {
    it("has proper focus-visible styles", () => {
      render(<Button>Focusable</Button>);
      const button = screen.getByText("Focusable");
      expect(button).toHaveClass("focus-visible:outline-none");
      expect(button).toHaveClass("focus-visible:ring-2");
      expect(button).toHaveClass("focus-visible:ring-ring");
      expect(button).toHaveClass("focus-visible:ring-offset-2");
    });

    it("has disabled:pointer-events-none class when disabled", () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText("Disabled");
      expect(button).toHaveClass("disabled:pointer-events-none");
      expect(button).toHaveClass("disabled:opacity-50");
    });

    it("has active:scale-95 class for click effect", () => {
      render(<Button>Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("active:scale-95");
    });
  });

  describe("Event handlers", () => {
    it("calls onClick handler when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      const button = screen.getByText("Click me");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("does not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Click me</Button>);
      const button = screen.getByText("Click me");
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Custom className", () => {
    it("accepts custom className", () => {
      render(<Button className="custom-button">Click me</Button>);
      const button = screen.getByText("Click me");
      expect(button).toHaveClass("custom-button");
    });
  });

  describe("Display name", () => {
    it("has correct display name", () => {
      expect(Button.displayName).toBe("Button");
    });
  });

  describe("Variants function", () => {
    it("exports buttonVariants for custom usage", () => {
      expect(buttonVariants).toBeDefined();
      expect(typeof buttonVariants).toBe("function");
    });
  });
});
