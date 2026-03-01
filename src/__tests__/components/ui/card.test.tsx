import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

describe("Card", () => {
  describe("Variants", () => {
    it("renders default variant with correct classes", () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstElementChild;
      expect(card).toHaveClass("rounded-2xl");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("text-card-foreground");
      expect(card).toHaveClass("shadow-playful");
    });

    it("renders elevated variant with correct classes", () => {
      const { container } = render(<Card variant="elevated">Content</Card>);
      const card = container.firstElementChild;
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("text-card-foreground");
      expect(card).toHaveClass("shadow-playful");
    });

    it("renders bordered variant with correct classes", () => {
      const { container } = render(<Card variant="bordered">Content</Card>);
      const card = container.firstElementChild;
      expect(card).toHaveClass("border-2");
    });
  });

  describe("CardHeader", () => {
    it("renders CardHeader with default spacing", () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
        </Card>
      );
      expect(screen.getByText("Header")).toHaveClass("px-6");
      expect(screen.getByText("Header")).toHaveClass("pt-6");
      expect(screen.getByText("Header")).toHaveClass("pb-4");
      expect(screen.getByText("Header")).toHaveClass("border-b");
    });

    it("renders CardHeader with none spacing", () => {
      render(
        <Card>
          <CardHeader spacing="none">Header</CardHeader>
        </Card>
      );
      expect(screen.getByText("Header")).not.toHaveClass("border-b");
    });
  });

  describe("CardTitle", () => {
    it("renders CardTitle with correct classes", () => {
      render(
        <Card>
          <CardTitle>Title</CardTitle>
        </Card>
      );
      const title = screen.getByText("Title");
      expect(title.tagName).toBe("H3");
      expect(title).toHaveClass("font-outfit");
      expect(title).toHaveClass("text-xl");
      expect(title).toHaveClass("font-bold");
      expect(title).toHaveClass("text-foreground");
    });

    it("accepts custom className", () => {
      render(
        <Card>
          <CardTitle className="custom-title">Title</CardTitle>
        </Card>
      );
      expect(screen.getByText("Title")).toHaveClass("custom-title");
    });
  });

  describe("CardDescription", () => {
    it("renders CardDescription with correct classes", () => {
      render(
        <Card>
          <CardDescription>Description</CardDescription>
        </Card>
      );
      const desc = screen.getByText("Description");
      expect(desc.tagName).toBe("P");
      expect(desc).toHaveClass("text-sm");
      expect(desc).toHaveClass("text-muted-foreground");
    });

    it("accepts custom className", () => {
      render(
        <Card>
          <CardDescription className="custom-desc">Description</CardDescription>
        </Card>
      );
      const desc = screen.getByText("Description");
      // The component concatenates className with mt-1
      expect(desc.className).toContain("custom-desc");
    });
  });

  describe("CardContent", () => {
    it("renders CardContent with default padding", () => {
      render(
        <Card>
          <CardContent>Content</CardContent>
        </Card>
      );
      expect(screen.getByText("Content")).toHaveClass("p-6");
    });

    it("renders CardContent with sm padding", () => {
      render(
        <Card>
          <CardContent padding="sm">Content</CardContent>
        </Card>
      );
      expect(screen.getByText("Content")).toHaveClass("p-4");
    });

    it("renders CardContent with lg padding", () => {
      render(
        <Card>
          <CardContent padding="lg">Content</CardContent>
        </Card>
      );
      expect(screen.getByText("Content")).toHaveClass("p-8");
    });

    it("renders CardContent with none padding", () => {
      const { container } = render(
        <Card>
          <CardContent padding="none">Content</CardContent>
        </Card>
      );
      const content = container.querySelector("div");
      expect(content).not.toHaveClass("p-6");
      expect(content).not.toHaveClass("p-4");
      expect(content).not.toHaveClass("p-8");
    });
  });

  describe("CardFooter", () => {
    it("renders CardFooter with default spacing", () => {
      render(
        <Card>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText("Footer")).toHaveClass("px-6");
      expect(screen.getByText("Footer")).toHaveClass("pt-4");
      expect(screen.getByText("Footer")).toHaveClass("pb-6");
      expect(screen.getByText("Footer")).toHaveClass("border-t");
    });

    it("renders CardFooter with none spacing", () => {
      render(
        <Card>
          <CardFooter spacing="none">Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText("Footer")).not.toHaveClass("border-t");
    });
  });

  describe("Combined usage", () => {
    it("renders complete card with all parts", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
          </CardHeader>
          <CardContent>Card Body Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText("Test Title")).toBeInTheDocument();
      expect(screen.getByText("Test Description")).toBeInTheDocument();
      expect(screen.getByText("Card Body Content")).toBeInTheDocument();
      expect(screen.getByText("Card Footer")).toBeInTheDocument();
    });

    it("supports custom className on Card component", () => {
      const { container } = render(
        <Card className="custom-card">
          <CardContent>Content</CardContent>
        </Card>
      );
      const card = container.firstElementChild;
      expect(card).toHaveClass("custom-card");
    });
  });

  describe("Display names", () => {
    it("Card has correct display name", () => {
      expect(Card.displayName).toBe("Card");
    });

    it("CardHeader has correct display name", () => {
      expect(CardHeader.displayName).toBe("CardHeader");
    });

    it("CardTitle has correct display name", () => {
      expect(CardTitle.displayName).toBe("CardTitle");
    });

    it("CardDescription has correct display name", () => {
      expect(CardDescription.displayName).toBe("CardDescription");
    });

    it("CardContent has correct display name", () => {
      expect(CardContent.displayName).toBe("CardContent");
    });

    it("CardFooter has correct display name", () => {
      expect(CardFooter.displayName).toBe("CardFooter");
    });
  });
});
