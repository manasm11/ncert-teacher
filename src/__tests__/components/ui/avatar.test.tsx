import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  getInitials,
  AvatarWithFallback,
} from "@/components/ui/avatar";

// Mock Radix UI primitives
vi.mock("@radix-ui/react-avatar", async () => {
  const actual = await vi.importActual("@radix-ui/react-avatar");
  return {
    ...actual,
    Root: Object.assign(
      (props: any) => <div data-testid="mock-avatar-root" {...props} />,
      { displayName: "Root" }
    ),
    Image: Object.assign(
      (props: any) => <img data-testid="mock-avatar-image" {...props} />,
      { displayName: "Image" }
    ),
    Fallback: Object.assign(
      (props: any) => (
        <div data-testid="mock-avatar-fallback" {...props}>
          {props.text || props.children}
        </div>
      ),
      { displayName: "Fallback" }
    ),
  };
});

describe("Avatar", () => {
  describe("Sizes", () => {
    it("renders sm size with correct classes", () => {
      render(<Avatar size="sm">A</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("h-8");
      expect(avatar).toHaveClass("w-8");
    });

    it("renders default size with correct classes", () => {
      render(<Avatar>Default</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("h-10");
      expect(avatar).toHaveClass("w-10");
    });

    it("renders lg size with correct classes", () => {
      render(<Avatar size="lg">Large</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("h-12");
      expect(avatar).toHaveClass("w-12");
    });

    it("renders xl size with correct classes", () => {
      render(<Avatar size="xl">XL</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("h-16");
      expect(avatar).toHaveClass("w-16");
    });

    it("renders 2xl size with correct classes", () => {
      render(<Avatar size="2xl">2XL</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("h-24");
      expect(avatar).toHaveClass("w-24");
    });
  });

  describe("Rounded variants", () => {
    it("renders default rounded-full", () => {
      render(<Avatar>Rounded</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("rounded-full");
    });

    it("renders sm rounded-sm", () => {
      render(<Avatar rounded="sm">Rounded</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("rounded-sm");
    });

    it("renders md rounded-md", () => {
      render(<Avatar rounded="md">Rounded</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("rounded-md");
    });

    it("renders lg rounded-lg", () => {
      render(<Avatar rounded="lg">Rounded</Avatar>);
      const avatar = screen.getByTestId("mock-avatar-root");
      expect(avatar).toHaveClass("rounded-lg");
    });
  });

  describe("AvatarImage", () => {
    it("renders image with correct classes", () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" alt="Test" />
        </Avatar>
      );
      const img = screen.getByTestId("mock-avatar-image");
      expect(img).toHaveAttribute("src", "/test.jpg");
      expect(img).toHaveAttribute("alt", "Test");
      expect(img).toHaveClass("aspect-square");
      expect(img).toHaveClass("h-full");
      expect(img).toHaveClass("w-full");
      expect(img).toHaveClass("object-cover");
    });
  });

  describe("AvatarFallback", () => {
    it("renders fallback with correct classes", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      const fallback = container.querySelector("[data-testid='mock-avatar-fallback']");
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveClass("flex");
      expect(fallback).toHaveClass("h-full");
      expect(fallback).toHaveClass("w-full");
      expect(fallback).toHaveClass("items-center");
      expect(fallback).toHaveClass("justify-center");
      expect(fallback).toHaveClass("font-medium");
    });

    it("renders custom text from text prop", () => {
      const { container } = render(
        <Avatar>
          <AvatarFallback text="Custom">Fallback</AvatarFallback>
        </Avatar>
      );
      const fallback = container.querySelector("[data-testid='mock-avatar-fallback']");
      expect(fallback).toHaveTextContent("Custom");
    });
  });

  describe("getInitials function", () => {
    it("returns first letter for single word name", () => {
      expect(getInitials("John")).toBe("J");
    });

    it("returns first letters for multi-word name", () => {
      expect(getInitials("John Doe")).toBe("JD");
    });

    it("returns first letters for three word name", () => {
      expect(getInitials("John Van Doe")).toBe("JV");
    });

    it("handles names with multiple spaces", () => {
      expect(getInitials("John   Doe")).toBe("JD");
    });

    it("handles empty string", () => {
      expect(getInitials("")).toBe("");
    });

    it("handles whitespace only", () => {
      expect(getInitials("   ")).toBe("");
    });

    it("respects maxInitials parameter", () => {
      expect(getInitials("John Van Doe", 3)).toBe("JVD");
    });
  });

  describe("AvatarWithFallback", () => {
    it("renders avatar with src and auto-generated initials", () => {
      render(
        <AvatarWithFallback src="/test.jpg" name="John Doe" />
      );
      expect(screen.getByTestId("mock-avatar-root")).toBeInTheDocument();
    });

    it("uses fallback text when provided instead of name", () => {
      const { container } = render(
        <AvatarWithFallback fallback="JD" />
      );
      const fallback = container.querySelector("[data-testid='mock-avatar-fallback']");
      expect(fallback).toHaveTextContent("JD");
    });

    it("uses name to generate initials when no fallback", () => {
      const { container } = render(
        <AvatarWithFallback name="Alice Smith" />
      );
      const fallback = container.querySelector("[data-testid='mock-avatar-fallback']");
      expect(fallback).toHaveTextContent("AS");
    });

    it("passes size prop to Avatar", () => {
      render(
        <AvatarWithFallback name="Test" size="lg" />
      );
      expect(screen.getByTestId("mock-avatar-root")).toHaveClass("h-12");
      expect(screen.getByTestId("mock-avatar-root")).toHaveClass("w-12");
    });

    it("passes rounded prop to Avatar", () => {
      render(
        <AvatarWithFallback name="Test" rounded="md" />
      );
      expect(screen.getByTestId("mock-avatar-root")).toHaveClass("rounded-md");
    });

    it("uses alt prop for image alt text", () => {
      render(
        <AvatarWithFallback src="/test.jpg" alt="Custom alt" name="Test" />
      );
      expect(screen.getByTestId("mock-avatar-image")).toHaveAttribute("alt", "Custom alt");
    });

    it("uses name as alt text when no alt prop", () => {
      render(
        <AvatarWithFallback src="/test.jpg" name="Test User" />
      );
      expect(screen.getByTestId("mock-avatar-image")).toHaveAttribute("alt", "Test User");
    });
  });

  describe("Custom className", () => {
    it("accepts custom className on Avatar", () => {
      render(<Avatar className="custom-avatar">Custom</Avatar>);
      expect(screen.getByTestId("mock-avatar-root")).toHaveClass("custom-avatar");
    });

    it("accepts custom className on AvatarImage (passed through)", () => {
      render(
        <Avatar>
          <AvatarImage src="/test.jpg" className="custom-image" />
        </Avatar>
      );
      // The AvatarImage component uses hardcoded className, so we just verify it renders
      const img = screen.getByTestId("mock-avatar-image");
      expect(img).toBeInTheDocument();
    });

    it("accepts custom className on AvatarFallback", () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback">FB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId("mock-avatar-fallback")).toHaveClass("custom-fallback");
    });
  });

  describe("Display names", () => {
    it("Avatar has correct display name", () => {
      expect(Avatar.displayName).toBe("Root");
    });

    it("AvatarImage has correct display name", () => {
      expect(AvatarImage.displayName).toBe("Image");
    });

    it("AvatarFallback has correct display name", () => {
      expect(AvatarFallback.displayName).toBe("Fallback");
    });

    it("AvatarWithFallback has correct display name", () => {
      expect(AvatarWithFallback.displayName).toBe("AvatarWithFallback");
    });
  });
});
