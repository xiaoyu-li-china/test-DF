import { Bold, Italic, List, Image as ImageIcon } from 'lucide-react';
import { ToolbarProps } from '@/types';

const Toolbar = ({ onCommand, activeStates, onInsertImage }: ToolbarProps) => {
  const buttons = [
    {
      command: 'bold',
      icon: <Bold size={18} />,
      label: '加粗',
      shortcut: 'Ctrl+B',
    },
    {
      command: 'italic',
      icon: <Italic size={18} />,
      label: '斜体',
      shortcut: 'Ctrl+I',
    },
    {
      command: 'insertUnorderedList',
      icon: <List size={18} />,
      label: '无序列表',
    },
  ];

  const handleMouseDown = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    onCommand(command, value);
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
      {buttons.map((btn) => (
        <button
          key={btn.command}
          onMouseDown={(e) => handleMouseDown(e, btn.command)}
          title={`${btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            activeStates[btn.command] ? 'bg-gray-200 text-blue-600' : 'text-gray-700'
          }`}
        >
          {btn.icon}
        </button>
      ))}
      <div className="w-px h-5 bg-gray-300 mx-1" />
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onInsertImage();
        }}
        title="插入图片"
        className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700"
      >
        <ImageIcon size={18} />
      </button>
      <div className="ml-auto text-xs text-gray-500">
        <span className="hidden sm:inline">快捷键: Ctrl+B 加粗 | Ctrl+I 斜体</span>
      </div>
    </div>
  );
};

export default Toolbar;
