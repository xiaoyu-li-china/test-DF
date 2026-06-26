export interface ToolbarButtonConfig {
  command: string;
  icon: string;
  label: string;
  shortcut?: string;
  value?: string;
}

export interface RichTextEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export interface ToolbarProps {
  onCommand: (command: string, value?: string) => void;
  activeStates: Record<string, boolean>;
  onInsertImage: () => void;
}
