import Fuse, { type FuseResultMatch, type IFuseOptions } from 'fuse.js';
import { ReactNode } from 'react';

export interface SearchItem {
  id: string;
  [key: string]: unknown;
}

const fuseOptions: IFuseOptions<SearchItem> = {
  threshold: 0.35,
  distance: 100,
  includeMatches: true,
  minMatchCharLength: 1,
  ignoreLocation: true,
  useExtendedSearch: true,
};

export function createFuseSearch<T extends SearchItem>(
  items: T[],
  keys: string[]
): Fuse<T> {
  return new Fuse(items, {
    ...fuseOptions,
    keys,
  });
}

export function highlightMatches(text: string, matches: readonly FuseResultMatch[] | undefined, key: string): ReactNode {
  if (!matches) return text;

  const match = matches.find(m => m.key === key);
  if (!match || !match.indices.length) return text;

  const result: ReactNode[] = [];
  let lastIndex = 0;

  for (const [start, end] of match.indices) {
    if (start > lastIndex) {
      result.push(text.slice(lastIndex, start));
    }
    result.push(<mark key={start}>{text.slice(start, end + 1)}</mark>);
    lastIndex = end + 1;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return <>{result}</>;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num);
}

export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, format = 'id-ID'): string {
  return new Intl.DateTimeFormat(format, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}