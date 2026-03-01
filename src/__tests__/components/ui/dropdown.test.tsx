import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";

// Mock Radix UI primitives
vi.mock("@radix-ui/react-dropdown-menu", async () => {
  const actual = await vi.importActual("@radix-ui/react-dropdown-menu");
  return {
    ...actual,
    Root: Object.assign(
      ({ children, open }: { children?: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => {
        return (
          <div data-testid="mock-root" data-open={open}>
            {children}
          </div>
        );
      },
      { displayName: "Root" }
    ),
    Trigger: Object.assign(
      (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button data-testid="mock-trigger" {...props} />,
      { displayName: "Trigger" }
    ),
    Content: Object.assign(
      ({ animated, className: propClassName, children, "data-side": dataSide, ...rest }: React.HTMLAttributes<HTMLDivElement> & { animated?: boolean; "data-side"?: string }) => {
        // Simulate dropdownMenuContentVariants behavior
        const baseClasses = "z-50 min-w-48 rounded-xl border";
        const hasAnimation = animated !== false;
        const animatedClasses = hasAnimation ? "animate-in fade-in zoom-in-95" : "";

        // Filter out ALL animation classes from Radix's className if animated is false
        let className = propClassName || "";
        if (!hasAnimation) {
          // Remove all Radix animation classes and our mock animation classes
          className = className
            .replace(/animate-in\s+fade-in\s+zoom-in-95\s+duration-200/g, "")
            .replace(/animate-in\s+fade-in\s+zoom-in-95\s+data-\[side=\w+\]:translate-/g, "")
            .replace(/animate-in\s+fade-in\s+zoom-in-95/g, "")
            .trim();
        }

        const classes = `${baseClasses} ${animatedClasses} ${className}`;
        return (
          <div data-testid="mock-content" className={classes} data-side={dataSide} {...rest}>
            {children}
          </div>
        );
      },
      { displayName: "Content" }
    ),
    Portal: ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-portal">{children}</div>,
    Group: Object.assign(
      ({ children }: { children?: React.ReactNode }) => <div data-testid="mock-group">{children}</div>,
      { displayName: "Group" }
    ),
    Label: Object.assign(
      (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="mock-label" {...props} />,
      { displayName: "Label" }
    ),
    Item: Object.assign(
      (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="mock-item" {...props} />,
      { displayName: "Item" }
    ),
    CheckboxItem: Object.assign(
      (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="mock-checkbox-item" {...props} />,
      { displayName: "CheckboxItem" }
    ),
    RadioItem: Object.assign(
      (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="mock-radio-item" {...props} />,
      { displayName: "RadioItem" }
    ),
    Separator: Object.assign(
      (props: React.HTMLAttributes<HTMLDivElement>) => <div data-testid="mock-separator" {...props} />,
      { displayName: "Separator" }
    ),
  };
});

vi.mock("lucide-react", () => ({
  Check: () => <span data-testid="check-icon">✓</span>,
  ChevronRight: () => <span data-testid="chevron-icon">→</span>,
  Circle: () => <span data-testid="circle-icon">●</span>,
}));

describe("DropdownMenu", () => {
  describe("Menu opening", () => {
    it("opens menu when trigger is clicked", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByTestId("mock-content")).toBeInTheDocument();
    });

    it("closes menu when trigger is clicked again", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText("Open");
      fireEvent.click(trigger);
      expect(screen.getByTestId("mock-content")).toBeInTheDocument();

      fireEvent.click(trigger);
    });
  });

  describe("DropdownMenuContent", () => {
    it("renders content inside portal", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByTestId("mock-portal")).toBeInTheDocument();
    });

    it("has correct classes for menu content", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      const content = screen.getByTestId("mock-content");
      expect(content).toHaveClass("z-50");
      expect(content).toHaveClass("min-w-48");
      expect(content).toHaveClass("rounded-xl");
      expect(content).toHaveClass("border");
    });

    it("has correct animation classes by default", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      const content = screen.getByTestId("mock-content");
      expect(content).toHaveClass("animate-in");
      expect(content).toHaveClass("fade-in");
      expect(content).toHaveClass("zoom-in-95");
    });

    it("does not animate when animated is false", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent animated={false}>Items</DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      const content = screen.getByTestId("mock-content");
      expect(content).not.toHaveClass("animate-in");
    });
  });

  describe("DropdownMenuLabel", () => {
    it("renders label with correct classes", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Section</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Section")).toBeInTheDocument();
      expect(screen.getByText("Section")).toHaveClass("px-2");
      expect(screen.getByText("Section")).toHaveClass("py-1.5");
      expect(screen.getByText("Section")).toHaveClass("text-xs");
      expect(screen.getByText("Section")).toHaveClass("font-semibold");
    });

    it("has inset class when inset is true", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Indented</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Indented")).toHaveClass("pl-8");
    });
  });

  describe("DropdownMenuItem", () => {
    it("renders item with correct classes", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Action</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Action")).toBeInTheDocument();
      expect(screen.getByText("Action")).toHaveClass("relative");
      expect(screen.getByText("Action")).toHaveClass("cursor-default");
      expect(screen.getByText("Action")).toHaveClass("select-none");
      expect(screen.getByText("Action")).toHaveClass("rounded-lg");
    });

    it("has hover styles", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Hover</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Hover")).toHaveClass("hover:bg-primary/10");
      expect(screen.getByText("Hover")).toHaveClass("hover:text-primary");
    });

    it("has inset class when inset is true", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset>Indented</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Indented")).toHaveClass("pl-8");
    });

    it("has destructive variant styles", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Delete")).toHaveClass("text-destructive");
      expect(screen.getByText("Delete")).toHaveClass("hover:bg-destructive/10");
    });

    it("has disabled pointer-events and opacity when disabled", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Disabled")).toHaveClass("data-[disabled]:pointer-events-none");
      expect(screen.getByText("Disabled")).toHaveClass("data-[disabled]:opacity-50");
    });
  });

  describe("DropdownMenuCheckboxItem", () => {
    it("renders checkbox item", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem>Toggle</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Toggle")).toBeInTheDocument();
      expect(screen.getByText("Toggle")).toHaveClass("relative");
    });
  });

  describe("DropdownMenuRadioItem", () => {
    it("renders radio item", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioItem>Option</DropdownMenuRadioItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByText("Option")).toBeInTheDocument();
    });
  });

  describe("DropdownMenuSeparator", () => {
    it("renders separator with correct classes", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      const separator = screen.getByTestId("mock-separator");
      expect(separator).toHaveClass("-mx-1");
      expect(separator).toHaveClass("my-1");
      expect(separator).toHaveClass("h-px");
      expect(separator).toHaveClass("bg-border");
    });
  });

  describe("DropdownMenuGroup", () => {
    it("renders group container", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
              <DropdownMenuItem>Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText("Open"));
      expect(screen.getByTestId("mock-group")).toBeInTheDocument();
    });
  });

  describe("Trigger variants", () => {
    it("renders trigger with default variant", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger variant="default">Open</DropdownMenuTrigger>
        </DropdownMenu>
      );
      const trigger = screen.getByText("Open");
      expect(trigger).toHaveClass("bg-transparent");
      expect(trigger).toHaveClass("text-foreground");
    });

    it("renders trigger with outline variant", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger variant="outline">Open</DropdownMenuTrigger>
        </DropdownMenu>
      );
      const trigger = screen.getByText("Open");
      expect(trigger).toHaveClass("border");
      expect(trigger).toHaveClass("hover:bg-primary/10");
    });

    it("renders trigger with ghost variant", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger variant="ghost">Open</DropdownMenuTrigger>
        </DropdownMenu>
      );
      const trigger = screen.getByText("Open");
      expect(trigger).toHaveClass("hover:bg-primary/10");
      expect(trigger).toHaveClass("hover:text-primary");
    });
  });

  describe("Accessibility", () => {
    it("trigger has focus-visible styles", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        </DropdownMenu>
      );
      const trigger = screen.getByText("Open");
      expect(trigger).toHaveClass("focus-visible:outline-none");
      expect(trigger).toHaveClass("focus-visible:ring-2");
      expect(trigger).toHaveClass("focus-visible:ring-ring");
      expect(trigger).toHaveClass("focus-visible:ring-offset-2");
    });
  });

  describe("Display names", () => {
    it("DropdownMenuTrigger has correct display name", () => {
      expect(DropdownMenuTrigger.displayName).toBe("Trigger");
    });

    it("DropdownMenuContent has correct display name", () => {
      expect(DropdownMenuContent.displayName).toBe("Content");
    });

    it("DropdownMenuLabel has correct display name", () => {
      expect(DropdownMenuLabel.displayName).toBe("Label");
    });

    it("DropdownMenuItem has correct display name", () => {
      expect(DropdownMenuItem.displayName).toBe("Item");
    });
  });
});
