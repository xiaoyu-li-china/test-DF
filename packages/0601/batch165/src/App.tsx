import { useState } from 'react';
import RichTextEditor from './components/RichTextEditor';

function App() {
  const [content, setContent] = useState('');

  const handleChange = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            简易富文本编辑器
          </h1>
          <p className="text-gray-600">
            基于 contentEditable 和 document.execCommand 实现
          </p>
        </div>

        <div className="mb-6">
          <RichTextEditor
            initialContent=""
            onChange={handleChange}
            placeholder="开始输入内容，使用工具栏或快捷键进行格式化..."
          />
        </div>

        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">HTML 输出</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 overflow-x-auto border border-gray-200">
            {content || '(空)'}
          </pre>
        </div>

        <div className="mt-6 bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">渲染预览</h2>
          <div
            className="prose max-w-none p-4 border border-gray-200 rounded-lg min-h-[100px]"
            dangerouslySetInnerHTML={{ __html: content || '<span class="text-gray-400">预览区域</span>' }}
          />
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">使用说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>加粗</strong>：点击工具栏 B 按钮，或按 Ctrl+B</li>
            <li>• <strong>斜体</strong>：点击工具栏 I 按钮，或按 Ctrl+I</li>
            <li>• <strong>无序列表</strong>：点击工具栏列表按钮</li>
            <li>• <strong>插入图片</strong>：点击工具栏图片图标，输入图片 URL</li>
            <li>• <strong>调整图片大小</strong>：点击选中图片，拖拽四个角的蓝色手柄</li>
            <li>• 选中文字后点击按钮可对选中内容应用格式</li>
            <li>• 光标移动时会保留当前格式状态</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
