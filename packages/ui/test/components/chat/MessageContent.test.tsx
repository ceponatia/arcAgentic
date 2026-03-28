import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageContent } from "../../../src/components/chat/MessageContent.js";

describe("MessageContent", () => {
  it("renders plain text content", () => {
    render(<MessageContent content="Simple text" />);

    expect(screen.getByText("Simple text")).toBeInTheDocument();
  });

  it("renders markdown content including formatting, code, and lists", () => {
    render(
      <MessageContent
        content={[
          "**Bold** and *italic*",
          "",
          "- First",
          "- Second",
          "",
          "```ts",
          "const answer = 42;",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("const answer = 42;")).toBeInTheDocument();
  });

  it("styles quoted dialogue distinctly from surrounding narration", () => {
    render(
      <MessageContent
        content={'She whispers, "stay close" before moving on.'}
      />,
    );

    const dialogue = screen.getByText('"stay close"');

    expect(dialogue.tagName).toBe("SPAN");
    expect(dialogue).toHaveClass("text-violet-300", "font-medium");
    expect(screen.getByText(/She whispers,/)).toBeInTheDocument();
  });

  it("does not style quoted text inside inline code", () => {
    render(<MessageContent content={'Use `say "hello"` to speak.'} />);

    const inlineCode = screen.getByText('say "hello"');

    expect(inlineCode.tagName).toBe("CODE");
    expect(inlineCode).not.toHaveClass("text-violet-300");
  });

  it("merges a custom className", () => {
    const { container } = render(
      <MessageContent content="Styled" className="custom-class" />,
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("renders empty content without crashing", () => {
    const { container } = render(<MessageContent content="" />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container).toHaveTextContent("");
  });
});
