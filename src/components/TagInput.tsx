import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Hash, Plus } from 'lucide-react';
import { pb, ensureAuth } from '../lib/pocketbase';
import { useAuth } from '../contexts/AuthContext';
import { invalidateTagCache } from '../lib/useTags';

interface TagOption {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const DEFAULT_COLOR = '#3B82F6';

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder }) => {
  const { user } = useAuth();
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const data = await pb.collection('tags').getFullList({ filter: `user_id = '${user.id}'`, sort: 'name' }).catch(() => null);
    if (data) setAllTags(data as TagOption[]);
  }, [user]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = allTags.filter(t =>
    !value.includes(t.name) &&
    t.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const trimmed = inputValue.trim();
  const canCreate = trimmed.length > 0 && !allTags.some(t => t.name.toLowerCase() === trimmed.toLowerCase()) && !value.includes(trimmed);
  const totalOptions = filtered.length + (canCreate ? 1 : 0);

  const addTag = (name: string) => {
    if (!value.includes(name)) {
      onChange([...value, name]);
    }
    setInputValue('');
    setHighlightIndex(0);
    inputRef.current?.focus();
  };

  const createAndAdd = async (name: string) => {
    if (!user) return;
    try { await ensureAuth(); } catch { return; }
    const newTag = {
      name: name.trim(),
      color: DEFAULT_COLOR,
      color_key: 'custom',
      count: 0,
      created_date: new Date().toISOString().split('T')[0],
      user_id: user.id,
      description: '',
    };
    const data = await pb.collection('tags').create(newTag).catch(() => null);
    if (data) {
      setAllTags(prev => [...prev, data as TagOption].sort((a, b) => a.name.localeCompare(b.name)));
      invalidateTagCache();
    }
    addTag(name.trim());
  };

  const removeTag = (name: string) => {
    onChange(value.filter(t => t !== name));
  };

  const getTagColor = (name: string): string => {
    return allTags.find(t => t.name === name)?.color || DEFAULT_COLOR;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!isOpen || totalOptions === 0) return;
      if (highlightIndex < filtered.length) {
        addTag(filtered[highlightIndex].name);
      } else if (canCreate) {
        createAndAdd(trimmed);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    } else if (e.key === ',') {
      e.preventDefault();
      if (trimmed) {
        const match = allTags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
        if (match) addTag(match.name);
        else createAndAdd(trimmed);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-[2.5rem] w-full px-3 py-2 border border-gray-300 rounded flex flex-wrap gap-1.5 items-center cursor-text focus-within:border-primary-700 focus-within:border-2 transition-colors duration-200"
        onClick={() => { inputRef.current?.focus(); setIsOpen(true); }}
      >
        {value.map(tag => {
          const color = getTagColor(tag);
          return (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: hexToRgba(color, 0.12), color }}
            >
              {tag}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[8rem] outline-none bg-transparent text-sm text-gray-700 placeholder-gray-400"
          placeholder={value.length === 0 ? (placeholder || 'Add tags...') : ''}
        />
      </div>

      {isOpen && (inputValue.length > 0 || filtered.length > 0) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((tag, i) => {
            const bg = hexToRgba(tag.color, 0.1);
            return (
              <button
                key={tag.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag(tag.name); }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors duration-100 ${highlightIndex === i ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
              >
                <span
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Hash className="w-3 h-3" style={{ color: tag.color }} />
                </span>
                <span className="text-gray-800">{tag.name}</span>
              </button>
            );
          })}
          {canCreate && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); createAndAdd(trimmed); }}
              onMouseEnter={() => setHighlightIndex(filtered.length)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left border-t border-gray-100 transition-colors duration-100 ${highlightIndex === filtered.length ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
            >
              <span className="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Plus className="w-3 h-3 text-primary-600" />
              </span>
              <span className="text-primary-700">Create <strong>"{trimmed}"</strong></span>
            </button>
          )}
          {filtered.length === 0 && !canCreate && inputValue.length > 0 && (
            <div className="px-3 py-3 text-xs text-gray-400 text-center">Tag already added</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagInput;
