import React, { useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, List, ListOrdered, Link, AlignLeft,
  AlignCenter, AlignRight, Strikethrough, Quote
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your message...',
  minHeight = 240,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = useCallback((command: string, val?: string) => {
    document.execCommand(command, false, val);
    editorRef.current?.focus();
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleLink = () => {
    const url = window.prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  };

  const ToolbarButton: React.FC<{
    onClick: () => void;
    title: string;
    children: React.ReactNode;
    active?: boolean;
  }> = ({ onClick, title, children, active }) => (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`p-1.5 rounded transition-colors duration-150 ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-gray-200 mx-0.5" />;

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden focus-within:border-primary-400 transition-colors duration-200">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        <ToolbarButton onClick={() => exec('bold')} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} title="Underline">
          <Underline className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('strikeThrough')} title="Strikethrough">
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => exec('justifyLeft')} title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyCenter')} title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('justifyRight')} title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} title="Bullet List">
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} title="Numbered List">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', 'blockquote')} title="Blockquote">
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={handleLink} title="Insert Link">
          <Link className="w-3.5 h-3.5" />
        </ToolbarButton>
        <Divider />
        <select
          onMouseDown={e => e.preventDefault()}
          onChange={e => exec('fontSize', e.target.value)}
          defaultValue="3"
          className="text-xs text-gray-600 bg-transparent border-none outline-none cursor-pointer py-0.5 px-1 rounded hover:bg-gray-100"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        style={{ minHeight }}
        className="px-4 py-3 text-sm text-gray-900 outline-none overflow-y-auto prose prose-sm max-w-none
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 [&_blockquote]:italic
          [&_a]:text-primary-600 [&_a]:underline
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
      />
    </div>
  );
};

export default RichTextEditor;
