import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import RichTextEditor from './RichTextEditor';

describe('RichTextEditor', () => {
  let execCommandSpy: ReturnType<typeof vi.spyOn>;
  let queryCommandStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    execCommandSpy = vi.spyOn(document, 'execCommand').mockImplementation((command) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return false;
      const range = selection.getRangeAt(0);
      if (range.collapsed) return false;
      const container = range.commonAncestorContainer as HTMLElement;
      const editor = container.closest?.('[data-testid="rich-text-editor"]') as HTMLDivElement;
      if (!editor) return false;
      const fragment = range.extractContents();
      const wrapper = document.createElement(
        command === 'bold' ? 'strong' : command === 'italic' ? 'em' : 'span'
      );
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      range.setStartAfter(wrapper);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      fireEvent.input(editor);
      return true;
    });

    queryCommandStateSpy = vi.spyOn(document, 'queryCommandState').mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setupSelection = (editor: HTMLElement) => {
    act(() => {
      editor.focus();
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
    });
  };

  it('should wrap selected text in <strong> tag when clicking bold button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor onChange={onChange} initialContent="Hello" />);
    const editor = screen.getByTestId('rich-text-editor') as HTMLDivElement;
    expect(editor).toBeInTheDocument();
    await waitFor(() => {
      expect(editor).toHaveTextContent('Hello');
    });
    setupSelection(editor);
    expect(window.getSelection()?.toString()).toBe('Hello');
    const boldButton = screen.getByTitle(/加粗/);
    await user.click(boldButton);
    expect(execCommandSpy).toHaveBeenCalledWith('bold', false, undefined);
    const strongElement = editor.querySelector('strong');
    expect(strongElement).toBeInTheDocument();
    expect(strongElement?.textContent).toBe('Hello');
  });

  it('should wrap selected text in <em> tag when clicking italic button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor onChange={onChange} initialContent="World" />);
    const editor = screen.getByTestId('rich-text-editor') as HTMLDivElement;
    expect(editor).toBeInTheDocument();
    await waitFor(() => {
      expect(editor).toHaveTextContent('World');
    });
    setupSelection(editor);
    expect(window.getSelection()?.toString()).toBe('World');
    const italicButton = screen.getByTitle(/斜体/);
    await user.click(italicButton);
    expect(execCommandSpy).toHaveBeenCalledWith('italic', false, undefined);
    const emElement = editor.querySelector('em');
    expect(emElement).toBeInTheDocument();
    expect(emElement?.textContent).toBe('World');
  });

  it('should call onChange with updated content containing <strong> after formatting', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RichTextEditor onChange={onChange} initialContent="Test" />);
    const editor = screen.getByTestId('rich-text-editor') as HTMLDivElement;
    await waitFor(() => {
      expect(editor).toHaveTextContent('Test');
    });
    setupSelection(editor);
    const boldButton = screen.getByTitle(/加粗/);
    await user.click(boldButton);
    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
    const lastHtmlCall = onChange.mock.calls
      .map((call) => call[0])
      .filter((content) => typeof content === 'string' && content.includes('<strong>Test</strong>'))
      .pop();
    expect(lastHtmlCall).toBeDefined();
    expect(lastHtmlCall).toContain('<strong>Test</strong>');
  });
});
