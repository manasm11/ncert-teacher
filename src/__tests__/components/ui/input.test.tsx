import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input, InputWithLabel, inputVariants } from "@/components/ui/input";

describe("Input", () => {
  describe("Variants", () => {
    it("renders default variant with correct classes", () => {
      render(<Input variant="default" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("h-12");
    });

    it("renders search variant with correct classes", () => {
      render(<Input variant="search" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("h-12");
      expect(input).toHaveClass("pr-10");
    });

    it("renders sm variant with correct classes", () => {
      render(<Input variant="sm" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("h-10");
      expect(input).toHaveClass("text-xs");
    });

    it("renders lg variant with correct classes", () => {
      render(<Input variant="lg" />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("h-14");
      expect(input).toHaveClass("text-base");
    });
  });

  describe("Basic functionality", () => {
    it("accepts value prop", () => {
      render(<Input value="test value" />);
      expect(screen.getByDisplayValue("test value")).toBeInTheDocument();
    });

    it("accepts placeholder prop", () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
    });

    it("calls onChange handler", () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "test" } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it("respects disabled prop", () => {
      render(<Input disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("has focus-visible styles", () => {
      render(<Input />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveClass("focus-visible:outline-none");
      expect(input).toHaveClass("focus-visible:ring-2");
      expect(input).toHaveClass("focus-visible:ring-ring");
    });
  });

  describe("InputWithLabel", () => {
    describe("Label", () => {
      it("renders label with correct text", () => {
        render(<InputWithLabel label="Username" />);
        expect(screen.getByText("Username")).toBeInTheDocument();
      });

      it("label is associated with input via htmlFor", () => {
        const { container } = render(<InputWithLabel label="Email" />);
        const label = screen.getByText("Email");
        const input = container.querySelector("input");
        expect(label).toHaveAttribute("for", input?.id);
      });

      it("renders required asterisk when required is true", () => {
        render(<InputWithLabel label="Name" required />);
        expect(screen.getByText("*")).toBeInTheDocument();
      });
    });

    describe("Error state", () => {
      it("renders error message when error is provided", () => {
        render(<InputWithLabel label="Email" error="Invalid email" />);
        expect(screen.getByText("Invalid email")).toBeInTheDocument();
      });

      it("error message has correct id for aria-describedby", () => {
        const { container } = render(<InputWithLabel label="Email" error="Invalid" />);
        const input = container.querySelector("input");
        const errorId = input?.getAttribute("aria-describedby");
        expect(errorId).toContain("-error");
        expect(screen.getByText("Invalid").id).toBe(errorId);
      });

      it("input has aria-invalid when error is present", () => {
        render(<InputWithLabel label="Email" error="Invalid" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveAttribute("aria-invalid", "true");
      });

      it("applies error styling when error is present", () => {
        render(<InputWithLabel label="Email" error="Invalid" />);
        const input = screen.getByRole("textbox");
        expect(input).toHaveClass("text-destructive");
        expect(input).toHaveClass("focus-visible:ring-destructive");
      });
    });

    describe("Helper text", () => {
      it("renders helper text when provided", () => {
        render(<InputWithLabel label="Username" helperText="Enter your username" />);
        expect(screen.getByText("Enter your username")).toBeInTheDocument();
      });

      it("helper text has correct id for aria-describedby", () => {
        const { container } = render(<InputWithLabel label="Username" helperText="Required" />);
        const input = container.querySelector("input");
        const helperId = input?.getAttribute("aria-describedby");
        expect(helperId).toContain("-helper");
        expect(screen.getByText("Required").id).toBe(helperId);
      });

      it("helper text uses muted-foreground color", () => {
        render(<InputWithLabel label="Username" helperText="Help text" />);
        expect(screen.getByText("Help text")).toHaveClass("text-xs");
      });
    });

    it("error takes precedence over helper text", () => {
      render(
        <InputWithLabel
          label="Email"
          error="Invalid email"
          helperText="Enter your email"
        />
      );
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
      expect(screen.queryByText("Enter your email")).not.toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("accepts custom className on Input", () => {
      render(<Input className="custom-input" />);
      expect(screen.getByRole("textbox")).toHaveClass("custom-input");
    });

    it("accepts custom className on InputWithLabel", () => {
      render(<InputWithLabel className="custom-input" />);
      expect(screen.getByRole("textbox")).toHaveClass("custom-input");
    });
  });

  describe("Variants function", () => {
    it("exports inputVariants for custom usage", () => {
      expect(inputVariants).toBeDefined();
      expect(typeof inputVariants).toBe("function");
    });
  });

  describe("Display names", () => {
    it("Input has correct display name", () => {
      expect(Input.displayName).toBe("Input");
    });

    it("InputWithLabel has correct display name", () => {
      expect(InputWithLabel.displayName).toBe("InputWithLabel");
    });
  });

  describe("Types", () => {
    it("renders input with type text by default", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
    });

    it("renders input with specified type", () => {
      render(<Input type="email" />);
      expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
    });
  });
});
