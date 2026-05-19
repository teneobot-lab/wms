'use client';

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import Fuse, { type FuseResultMatch } from 'fuse.js';
import { api } from '@/lib/api';

interface SearchOption {
  id: string;
  label: string;
  secondary?: string;
  [key: string]: unknown;
}

interface SearchAutocompleteProps {
  endpoint: string;
  placeholder?: string;
  value: string;
  onChange?: (value: string) => void;
  onSelect: (item: SearchOption) => void;
  fuseKeys?: string[];
  minChars?: number;
  maxResults?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  renderOption?: (item: SearchOption, query: string) => ReactNode;
}

export function SearchAutocomplete({
  endpoint,
  placeholder = '',
  value,
  onChange,
  onSelect,
  fuseKeys = ['label', 'secondary'],
  minChars = 1,
  maxResults = 12,
  autoFocus = false,
  disabled = false,
  renderOption,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const fuseRef = useRef<Fuse<SearchOption> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<SearchOption[]>([]);
  const cacheTimeRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    const now = Date.now();
    if (cacheRef.current.length > 0 && now - cacheTimeRef.current < 5 * 60 * 1000) {
      fuseRef.current = new Fuse(cacheRef.current, {
        threshold: 0.35,
        distance: 100,
        includeMatches: true,
        minMatchCharLength: 1,
        ignoreLocation: true,
        keys: fuseKeys,
      });
      return;
    }

    try {
      const res = await api.get(`${endpoint}?q=`);
      const data = res.data.data || [];
      cacheRef.current = data;
      cacheTimeRef.current = now;

      fuseRef.current = new Fuse(data, {
        threshold: 0.35,
        distance: 100,
        includeMatches: true,
        minMatchCharLength: 1,
        ignoreLocation: true,
        keys: fuseKeys,
      });
    } catch { /* silent */ }
  }, [endpoint, fuseKeys]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
    setActiveIndex(-1);

    if (val.length < minChars) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (fuseRef.current) {
      const searchResults = fuseRef.current.search(val);
      setResults(searchResults.slice(0, maxResults).map(r => r.item));
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && query.length >= minChars) setIsOpen(true);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) selectItem(results[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case 'Tab':
        if (activeIndex >= 0 && results[activeIndex]) selectItem(results[activeIndex]);
        break;
    }
  };

  const selectItem = (item: SearchOption) => {
    setQuery(item.label);
    onSelect(item);
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  };

  const highlight = (text: string, matches: readonly FuseResultMatch[] | undefined, key: string) => {
    if (!matches) return text;
    const match = matches.find(m => m.key === key);
    if (!match || !match.indices.length) return text;

    const result: React.ReactNode[] = [];
    let lastIndex = 0;
    for (const [start, end] of match.indices) {
      if (start > lastIndex) result.push(text.slice(lastIndex, start));
      result.push(
        <mark key={start} style={{ background: 'transparent', color: 'var(--primary-700)', fontWeight: 600 }}>
          {text.slice(start, end + 1)}
        </mark>
      );
      lastIndex = end + 1;
    }
    if (lastIndex < text.length) result.push(text.slice(lastIndex));
    return <>{result}</>;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query.length >= minChars && fuseRef.current && setIsOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--text-primary)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
        autoComplete="off"
      />

      {isOpen && results.length > 0 && (
        <div
          className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-[var(--border)]"
          style={{ minWidth: '100%', maxHeight: 192, overflowY: 'auto' }}
        >
          {results.map((item, index) => (
            <div
              key={item.id}
              onMouseDown={() => selectItem(item)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`px-3 py-2 cursor-pointer border-b border-[var(--border)] last:border-0 ${
                index === activeIndex
                  ? 'bg-[var(--primary-100)]'
                  : 'hover:bg-[var(--table-hover)]'
              }`}
            >
              {renderOption ? renderOption(item, query) : (
                <div>
                  <div className="text-sm text-[var(--text-primary)]">
                    {highlight(
                      item.label,
                      fuseRef.current?.search(query).find(r => r.item.id === item.id)?.matches,
                      'label'
                    )}
                  </div>
                  {item.secondary && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.secondary}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= minChars && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-[var(--border)] px-3 py-2" style={{ minWidth: '100%' }}>
          <div className="text-xs text-[var(--text-muted)]">Tidak ada hasil</div>
        </div>
      )}
    </div>
  );
}