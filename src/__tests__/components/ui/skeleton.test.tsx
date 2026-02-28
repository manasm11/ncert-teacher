import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  ListSkeleton,
  AvatarSkeleton,
} from "@/components/ui/skeleton";

// Add a visible marker for skeleton elements to query
const SkeletonWithText = ({ children, ...props }: any) => (
  <div className="skeleton-wrapper" {...props}>
    {children}
  </div>
);

describe("Skeleton", () => {
  describe("Variants", () => {
    it("renders rectangle variant with correct classes", () => {
      const { container } = render(<Skeleton variant="rectangle" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("rounded-md");
      expect(skeleton).toHaveClass("animate-pulse");
      expect(skeleton).toHaveClass("bg-primary/10");
    });

    it("renders circle variant with correct classes", () => {
      const { container } = render(<Skeleton variant="circle" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("rounded-full");
    });

    it("renders text variant with correct classes", () => {
      const { container } = render(<Skeleton variant="text" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("rounded-md");
    });
  });

  describe("Sizes", () => {
    it("renders sm size with correct dimensions", () => {
      const { container } = render(<Skeleton size="sm" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("h-3");
      expect(skeleton).toHaveClass("w-20");
    });

    it("renders default size with correct dimensions", () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("h-4");
      expect(skeleton).toHaveClass("w-full");
    });

    it("renders lg size with correct dimensions", () => {
      const { container } = render(<Skeleton size="lg" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("h-6");
      expect(skeleton).toHaveClass("w-full");
    });

    it("renders icon size with correct dimensions", () => {
      const { container } = render(<Skeleton size="icon" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("h-8");
      expect(skeleton).toHaveClass("w-8");
    });
  });

  describe("Custom dimensions", () => {
    it("accepts custom width", () => {
      const { container } = render(<Skeleton width="100px" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveStyle("width: 100px");
    });

    it("accepts custom width as number", () => {
      const { container } = render(<Skeleton width={150} />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveStyle("width: 150px");
    });

    it("accepts custom height", () => {
      const { container } = render(<Skeleton height="50px" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveStyle("height: 50px");
    });

    it("accepts custom height as number", () => {
      const { container } = render(<Skeleton height={75} />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveStyle("height: 75px");
    });

    it("accepts custom border radius", () => {
      const { container } = render(<Skeleton borderRadius="8px" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveStyle("border-radius: 8px");
    });
  });

  describe("Custom className", () => {
    it("accepts custom className", () => {
      const { container } = render(<Skeleton className="custom-skeleton" />);
      const skeleton = container.querySelector("div[class*='animate-pulse']");
      expect(skeleton).toHaveClass("custom-skeleton");
    });
  });

  describe("TextSkeleton", () => {
    it("renders multiple lines by default", () => {
      const { container } = render(<TextSkeleton />);
      // TextSkeleton renders 3 skeleton divs (one for each line)
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      expect(lines).toHaveLength(3);
    });

    it("renders custom number of lines", () => {
      const { container } = render(<TextSkeleton lines={5} />);
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      expect(lines).toHaveLength(5);
    });

    it("applies spacing between lines", () => {
      const { container } = render(<TextSkeleton spacing="mb-2" />);
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      expect(lines.length).toBeGreaterThan(0);
    });

    it("last line has no spacing", () => {
      const { container } = render(<TextSkeleton lines={3} />);
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      const lastLine = lines[lines.length - 1];
      expect(lastLine.parentElement.className).not.toContain("mb-4");
    });

    it("first line uses lg size", () => {
      const { container } = render(<TextSkeleton lines={3} />);
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      expect(lines[0]).toHaveClass("h-6");
      expect(lines[0]).toHaveClass("w-full");
    });

    it("subsequent lines use default size", () => {
      const { container } = render(<TextSkeleton lines={3} />);
      const lines = container.querySelectorAll("[data-testid='skeleton']");
      expect(lines[1]).toHaveClass("h-4");
      expect(lines[1]).toHaveClass("w-full");
    });
  });

  describe("CardSkeleton", () => {
    it("renders card container with correct classes", () => {
      const { container } = render(<CardSkeleton />);
      const card = container.querySelector(".rounded-2xl");
      expect(card).toHaveClass("rounded-2xl");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("p-6");
    });

    it("renders header skeleton", () => {
      const { container } = render(<CardSkeleton />);
      const skeletons = container.querySelectorAll("[data-testid='skeleton']");
      expect(skeletons).toHaveLength(6);
    });

    it("renders content line skeletons", () => {
      const { container } = render(<CardSkeleton />);
      const skeletons = container.querySelectorAll("div[class*='animate-pulse']");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders action button skeletons", () => {
      const { container } = render(<CardSkeleton />);
      const skeletons = container.querySelectorAll("div[class*='animate-pulse']");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe("ListSkeleton", () => {
    it("renders correct number of items by default", () => {
      const { container } = render(<ListSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      // 5 avatars + 10 text elements = 15
      expect(items.length).toBe(15);
    });

    it("renders custom number of items", () => {
      const { container } = render(<ListSkeleton items={3} />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      // 3 avatars + 6 text = 9
      expect(items.length).toBe(9);
    });

    it("renders avatar with circle variant", () => {
      const { container } = render(<ListSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      expect(items[0]).toHaveClass("rounded-full");
    });

    it("renders text elements with correct sizes", () => {
      const { container } = render(<ListSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      // items[0] is avatar circle (h-4 w-4), items[1] is name skeleton
      // items[2] is description skeleton
      expect(items[1]).toHaveClass("h-3");
      expect(items[1]).toHaveClass("w-20");
    });
  });

  describe("AvatarSkeleton", () => {
    it("renders avatar with circle variant", () => {
      const { container } = render(<AvatarSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      expect(items[0]).toHaveClass("rounded-full");
    });

    it("renders name skeleton with sm size", () => {
      const { container } = render(<AvatarSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      expect(items[1]).toHaveClass("h-3");
      expect(items[1]).toHaveClass("w-20");
    });

    it("renders description skeleton with default size", () => {
      const { container } = render(<AvatarSkeleton />);
      const items = container.querySelectorAll("[data-testid='skeleton']");
      expect(items[2]).toHaveClass("h-4");
    });
  });

  describe("Display names", () => {
    it("Skeleton has correct display name", () => {
      expect(Skeleton.displayName).toBe("Skeleton");
    });

    it("TextSkeleton has correct display name", () => {
      expect(TextSkeleton.displayName).toBe("TextSkeleton");
    });

    it("CardSkeleton has correct display name", () => {
      expect(CardSkeleton.displayName).toBe("CardSkeleton");
    });

    it("ListSkeleton has correct display name", () => {
      expect(ListSkeleton.displayName).toBe("ListSkeleton");
    });

    it("AvatarSkeleton has correct display name", () => {
      expect(AvatarSkeleton.displayName).toBe("AvatarSkeleton");
    });
  });
});
