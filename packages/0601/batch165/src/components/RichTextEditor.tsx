import { useState, useRef, useEffect, useCallback } from 'react';
import Toolbar from './Toolbar';
import { RichTextEditorProps } from '@/types';

const RichTextEditor = ({
  initialContent = '',
  onChange,
  placeholder = '请输入内容...',
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({
    bold: false,
    italic: false,
    insertUnorderedList: false,
  });
  const [isFocused, setIsFocused] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [resizerPosition, setResizerPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
      editorRef.current.focus();
    }
  }, []);

  const updateActiveStates = useCallback(() => {
    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
    });
  }, []);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      restoreSelection();
      document.execCommand(command, false, value);
      updateActiveStates();
      if (onChange && editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [restoreSelection, updateActiveStates, onChange]
  );

  const getClosestLi = useCallback((): HTMLLIElement | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    if (!node) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
    return element?.closest('li') ?? null;
  }, []);

  const isLiEmpty = useCallback((li: HTMLLIElement): boolean => {
    const text = li.textContent?.trim() ?? '';
    if (text === '') return true;
    if (li.querySelectorAll('br').length > 0 && text === '') return true;
    return false;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
          case 'i':
            e.preventDefault();
            execCommand(e.key.toLowerCase() === 'b' ? 'bold' : 'italic');
            break;
        }
        return;
      }

      if (e.key === 'Enter') {
        const li = getClosestLi();
        if (li) {
          const ul = li.parentElement;
          if (!ul) return;

          if (isLiEmpty(li)) {
            e.preventDefault();
            const newP = document.createElement('p');
            newP.innerHTML = '<br>';
            if (ul.lastChild === li) {
              ul.parentElement?.after(newP);
            } else {
              li.after(newP);
            }
            li.remove();
            if (ul.children.length === 0) {
              ul.remove();
            }
            const range = document.createRange();
            range.setStart(newP, 0);
            range.collapse(true);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            updateActiveStates();
            if (onChange && editorRef.current) {
              onChange(editorRef.current.innerHTML);
            }
            return;
          }

          e.preventDefault();
          const newLi = document.createElement('li');
          newLi.innerHTML = '<br>';

          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            const liRange = document.createRange();
            liRange.setStart(range.endContainer, range.endOffset);
            liRange.setEnd(li, li.childNodes.length);
            const fragment = liRange.extractContents();
            newLi.innerHTML = '';
            newLi.appendChild(fragment);
            if (newLi.innerHTML.trim() === '') {
              newLi.innerHTML = '<br>';
            }
          }

          li.after(newLi);

          const range = document.createRange();
          range.setStart(newLi, 0);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
          updateActiveStates();
          if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
          }
          return;
        }
      }
    },
    [execCommand, getClosestLi, isLiEmpty, updateActiveStates, onChange]
  );

  const handleInput = useCallback(() => {
    saveSelection();
    updateActiveStates();
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [saveSelection, updateActiveStates, onChange]);

  const handleSelect = useCallback(() => {
    saveSelection();
    updateActiveStates();
  }, [saveSelection, updateActiveStates]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    updateActiveStates();
  }, [updateActiveStates]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleInsertImage = useCallback(() => {
    saveSelection();
    setShowImageModal(true);
    setImageUrl('');
  }, [saveSelection]);

  const confirmInsertImage = useCallback(() => {
    if (!imageUrl.trim()) return;
    setShowImageModal(false);
    restoreSelection();
    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.cursor = 'pointer';
    img.dataset.editableImage = 'true';
    img.addEventListener('load', () => {
      img.setAttribute('data-natural-width', String(img.naturalWidth));
      img.setAttribute('data-natural-height', String(img.naturalHeight));
    });
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editorRef.current?.appendChild(img);
    }
    updateActiveStates();
    if (onChange && editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    setImageUrl('');
  }, [imageUrl, restoreSelection, updateActiveStates, onChange]);

  const updateResizerPosition = useCallback((img: HTMLImageElement) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    setResizerPosition({
      top: imgRect.top - containerRect.top,
      left: imgRect.left - containerRect.left,
      width: imgRect.width,
      height: imgRect.height,
    });
  }, []);

  const handleImageClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof HTMLImageElement && target.dataset.editableImage === 'true') {
        e.stopPropagation();
        setSelectedImage(target);
        updateResizerPosition(target);
      }
    },
    [updateResizerPosition]
  );

  const handleEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target;
      if (!(target instanceof HTMLImageElement) || target.dataset.editableImage !== 'true') {
        setSelectedImage(null);
        setResizerPosition(null);
      }
    },
    []
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!selectedImage) return;
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = true;
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: resizerPosition?.width ?? selectedImage.offsetWidth,
        height: resizerPosition?.height ?? selectedImage.offsetHeight,
      };
    },
    [selectedImage, resizerPosition]
  );

  const handleDocumentMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizingRef.current || !selectedImage || !resizeStartRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const naturalWidth = parseInt(selectedImage.dataset.naturalWidth ?? '0', 10);
      const naturalHeight = parseInt(selectedImage.dataset.naturalHeight ?? '0', 10);
      const aspectRatio = naturalWidth && naturalHeight ? naturalWidth / naturalHeight : 1;
      let newWidth = Math.max(50, resizeStartRef.current.width + dx);
      const maxWidth = containerRef.current?.clientWidth ?? 800;
      newWidth = Math.min(newWidth, maxWidth);
      const newHeight = newWidth / aspectRatio;
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = 'auto';
      updateResizerPosition(selectedImage);
    },
    [selectedImage, updateResizerPosition]
  );

  const handleDocumentMouseUp = useCallback(() => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      resizeStartRef.current = null;
      if (onChange && editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }
  }, [onChange]);

  const handleDocumentClick = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setSelectedImage(null);
        setResizerPosition(null);
      }
    },
    []
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault();
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      if (html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const allowedTags = new Set([
          'B', 'I', 'U', 'STRONG', 'EM', 'UL', 'OL', 'LI',
          'P', 'BR', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4',
          'A', 'SUB', 'SUP', 'STRIKE', 'S', 'IMG',
        ]);
        const allowedStyles = new Set(['font-weight', 'font-style', 'text-decoration', 'width', 'height']);
        const imgAttrs = new Set(['src', 'alt', 'width', 'height']);
        const sanitize = (node: Node): Node | null => {
          if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent ?? '');
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const tag = el.tagName.toUpperCase();
            if (!allowedTags.has(tag)) {
              const fragment = document.createDocumentFragment();
              Array.from(el.childNodes).forEach((child) => {
                const sanitized = sanitize(child);
                if (sanitized) fragment.appendChild(sanitized);
              });
              return fragment;
            }
            if (tag === 'IMG') {
              const imgEl = el as HTMLImageElement;
              const clean = document.createElement('img');
              clean.dataset.editableImage = 'true';
              clean.style.display = 'block';
              clean.style.cursor = 'pointer';
              clean.style.width = '100%';
              clean.style.height = 'auto';
              imgAttrs.forEach((attr) => {
                if (imgEl.hasAttribute(attr)) {
                  clean.setAttribute(attr, imgEl.getAttribute(attr) ?? '');
                }
              });
              clean.addEventListener('load', () => {
                clean.setAttribute('data-natural-width', String(clean.naturalWidth));
                clean.setAttribute('data-natural-height', String(clean.naturalHeight));
              });
              return clean;
            }
            const clean = document.createElement(tag);
            if (el.style) {
              for (let i = 0; i < el.style.length; i++) {
                const prop = el.style[i];
                if (allowedStyles.has(prop)) {
                  (clean as HTMLElement).style.setProperty(prop, el.style.getPropertyValue(prop));
                }
              }
            }
            Array.from(el.childNodes).forEach((child) => {
              const sanitized = sanitize(child);
              if (sanitized) clean.appendChild(sanitized);
            });
            return clean;
          }
          return null;
        };
        const fragment = document.createDocumentFragment();
        Array.from(doc.body.childNodes).forEach((child) => {
          const sanitized = sanitize(child);
          if (sanitized) fragment.appendChild(sanitized);
        });
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(fragment);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else if (text) {
        document.execCommand('insertText', false, text);
      }
      updateActiveStates();
      if (onChange && editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    },
    [updateActiveStates, onChange]
  );

  useEffect(() => {
    const handleSelectionChange = () => {
      if (document.activeElement === editorRef.current) {
        updateActiveStates();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [updateActiveStates, handleDocumentMouseMove, handleDocumentMouseUp, handleDocumentClick]);

  useEffect(() => {
    if (editorRef.current && initialContent && editorRef.current.innerHTML !== initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.addEventListener('click', handleImageClick as EventListener);
    return () => {
      editor.removeEventListener('click', handleImageClick as EventListener);
    };
  }, [handleImageClick]);

  useEffect(() => {
    if (selectedImage) {
      updateResizerPosition(selectedImage);
    }
  }, [selectedImage, updateResizerPosition]);

  const showPlaceholder =
    !isFocused && editorRef.current?.innerHTML.trim() === '';

  return (
    <div
      ref={containerRef}
      className="w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent relative"
    >
      <Toolbar onCommand={execCommand} activeStates={activeStates} onInsertImage={handleInsertImage} />
      <div className="relative">
        {showPlaceholder && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          data-testid="rich-text-editor"
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onSelect={handleSelect}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onClick={handleEditorClick}
          className="min-h-[200px] p-3 outline-none prose prose-sm max-w-none"
          style={{ wordBreak: 'break-word' }}
        />
      </div>

      {selectedImage && resizerPosition && (
        <div
          style={{
            position: 'absolute',
            top: resizerPosition.top,
            left: resizerPosition.left,
            width: resizerPosition.width,
            height: resizerPosition.height,
            pointerEvents: 'none',
            boxShadow: '0 0 0 2px #3b82f6',
            borderRadius: '2px',
          }}
        >
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 12,
              height: 12,
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '2px',
              cursor: 'se-resize',
              pointerEvents: 'auto',
            }}
          />
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              left: -6,
              bottom: -6,
              width: 12,
              height: 12,
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '2px',
              cursor: 'sw-resize',
              pointerEvents: 'auto',
            }}
          />
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              right: -6,
              top: -6,
              width: 12,
              height: 12,
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '2px',
              cursor: 'ne-resize',
              pointerEvents: 'auto',
            }}
          />
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              left: -6,
              top: -6,
              width: 12,
              height: 12,
              backgroundColor: '#3b82f6',
              border: '2px solid white',
              borderRadius: '2px',
              cursor: 'nw-resize',
              pointerEvents: 'auto',
            }}
          />
        </div>
      )}

      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4">插入图片</h3>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="请输入图片 URL..."
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  confirmInsertImage();
                }
              }}
            />
            {imageUrl.trim() && (
              <div className="mb-4 p-2 border border-gray-200 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">预览：</p>
                <img
                  src={imageUrl}
                  alt="预览"
                  className="max-h-32 mx-auto rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmInsertImage}
                disabled={!imageUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                插入
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .prose ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .prose ul ul {
          list-style-type: circle;
        }
        .prose li {
          margin: 0.25em 0;
        }
        .prose strong {
          font-weight: 700;
        }
        .prose em {
          font-style: italic;
        }
        .prose img[data-editable-image="true"] {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0.5em 0;
          border-radius: 4px;
          cursor: pointer;
          transition: box-shadow 0.15s;
        }
        .prose img[data-editable-image="true"]:hover {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
