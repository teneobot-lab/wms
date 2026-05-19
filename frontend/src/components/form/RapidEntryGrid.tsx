'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

export interface RapidEntryRow {
  id: string;
  productId: string;
  productLabel: string;
  productSku: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  notes: string;
}

interface ProductResult {
  id: string;
  name: string;
  sku: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  totalQty: number;
}

interface RapidEntryGridProps {
  rows: RapidEntryRow[];
  onChange: (rows: RapidEntryRow[]) => void;
  disabled?: boolean;
  productEndpoint?: string;
  showSellPrice?: boolean;
}

const emptyRow = (): RapidEntryRow => ({
  id: `row-${Date.now()}-${Math.random()}`,
  productId: '', productLabel: '', productSku: '',
  qty: 1, unitPrice: 0, totalPrice: 0, notes: '',
});

export function RapidEntryGrid({
  rows, onChange, disabled = false,
  productEndpoint = '/search/products', showSellPrice = false,
}: RapidEntryGridProps) {
  const productInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const registerRef = useCallback((index: number, el: HTMLInputElement | null) => {
    if (el) productInputRefs.current.set(index, el);
    else productInputRefs.current.delete(index);
  }, []);

  const focusRow = useCallback((index: number) => {
    setTimeout(() => {
      productInputRefs.current.get(index)?.focus();
    }, 50);
  }, []);

  const updateRow = useCallback((index: number, fields: Partial<RapidEntryRow>) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], ...fields };
    if ('qty' in fields || 'unitPrice' in fields) {
      updated[index].totalPrice = Number(updated[index].qty) * Number(updated[index].unitPrice);
    }
    onChange(updated);
  }, [rows, onChange]);

  const addRow = useCallback(() => {
    onChange([...rows, emptyRow()]);
  }, [rows, onChange]);

  const deleteRow = useCallback((index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated.length ? updated : [emptyRow()]);
  }, [rows, onChange]);

  const totalAmount = rows.reduce((sum, r) => sum + r.totalPrice, 0);
  const validCount = rows.filter(r => r.productId).length;

  return (
    <div className="border border-[var(--border)] bg-white">
      <div className="px-3 py-2 border-b border-[var(--border)] flex items-center justify-between bg-[var(--table-header)]">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Detail Barang</span>
        <span className="text-[11px] text-[var(--text-muted)]">
          {validCount} item &middot; Total: <span className="font-mono font-semibold text-[var(--text-primary)]">Rp {totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</span>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)] bg-[var(--table-header)]">
              <th className="px-2 py-2 font-semibold text-center border-r border-[var(--border)] w-8">#</th>
              <th className="px-2 py-2 font-semibold border-r border-[var(--border)]" style={{ minWidth: 240 }}>Kode / Nama Barang</th>
              <th className="px-2 py-2 font-semibold text-right border-r border-[var(--border)] w-20">Qty</th>
              <th className="px-2 py-2 font-semibold text-right border-r border-[var(--border)] w-28">Harga Satuan</th>
              <th className="px-2 py-2 font-semibold text-right border-r border-[var(--border)] w-28">Total</th>
              <th className="px-2 py-2 font-semibold border-r border-[var(--border)] w-32">Keterangan</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <GridRow
                key={row.id}
                row={row}
                index={index}
                isLast={index === rows.length - 1}
                disabled={disabled}
                productEndpoint={productEndpoint}
                showSellPrice={showSellPrice}
                onUpdate={(fields) => updateRow(index, fields)}
                onDelete={() => deleteRow(index)}
                onAddRow={addRow}
                onFocusNext={focusRow}
                registerRef={registerRef}
                totalRows={rows.length}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--border)] bg-[var(--table-header)]">
              <td colSpan={4} className="px-3 py-2 text-right">
                <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">Total</span>
              </td>
              <td className="px-2 py-2 text-right">
                <span className="font-mono font-bold text-sm text-[var(--text-primary)]">Rp {totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</span>
              </td>
              <td colSpan={2} className="px-2 py-1.5">
                <button
                  onClick={addRow}
                  disabled={disabled}
                  className="px-3 py-1 text-[11px] bg-white border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary-500)] hover:text-[var(--primary-700)] disabled:opacity-40 w-full"
                >
                  + Tambah Baris
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

interface GridRowProps {
  row: RapidEntryRow;
  index: number;
  isLast: boolean;
  disabled: boolean;
  productEndpoint: string;
  showSellPrice: boolean;
  onUpdate: (fields: Partial<RapidEntryRow>) => void;
  onDelete: () => void;
  onAddRow: () => void;
  onFocusNext: (index: number) => void;
  registerRef: (index: number, el: HTMLInputElement | null) => void;
  totalRows: number;
}

function GridRow({
  row, index, isLast, disabled, productEndpoint, showSellPrice,
  onUpdate, onDelete, onAddRow, onFocusNext, registerRef,
}: GridRowProps) {
  const [query, setQuery] = useState(row.productLabel);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(row.productLabel); }, [row.productLabel]);

  const searchProducts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 1) { setResults([]); setOpen(false); return; }
    try {
      const res = await api.get(`${productEndpoint}?q=${encodeURIComponent(q)}`);
      const data: ProductResult[] = res.data.data || [];
      setResults(data);
      setOpen(data.length > 0);
      setActiveIdx(0);
    } catch { setResults([]); }
  }, [productEndpoint]);

  const selectProduct = useCallback((p: ProductResult) => {
    const price = showSellPrice ? p.sellPrice : p.costPrice;
    setQuery(p.name);
    setOpen(false);
    setResults([]);
    onUpdate({ productId: p.id, productLabel: p.name, productSku: p.sku, unitPrice: price, qty: 1, totalPrice: price });
    setTimeout(() => { qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }, 30);
  }, [onUpdate, showSellPrice]);

  const handleProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && results.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); if (results[activeIdx]) selectProduct(results[activeIdx]); return; }
      if (e.key === 'Escape') { setOpen(false); return; }
    }
    if (e.key === 'Enter' && !open) { e.preventDefault(); qtyInputRef.current?.focus(); qtyInputRef.current?.select(); }
  };

  const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (isLast) { onAddRow(); onFocusNext(index + 1); }
      else { onFocusNext(index + 1); }
    }
    if (e.key === 'ArrowUp' && index > 0) { e.preventDefault(); onFocusNext(index - 1); }
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); notesInputRef.current?.focus(); }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLast) { onAddRow(); onFocusNext(index + 1); }
      else { onFocusNext(index + 1); }
    }
  };

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--table-hover)]">
      <td className="px-2 py-1 text-center text-[var(--text-muted)] border-r border-[var(--border)] select-none text-[10px]">{index + 1}</td>
      <td className="px-1 py-1 border-r border-[var(--border)] relative">
        <input
          ref={(el) => registerRef(index, el)}
          type="text"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (!v) onUpdate({ productId: '', productLabel: '', productSku: '' });
            searchProducts(v);
          }}
          onKeyDown={handleProductKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (query.length >= 1) searchProducts(query); }}
          disabled={disabled}
          className="w-full px-2 py-1 text-xs text-[var(--text-primary)] border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
          autoComplete="off"
          style={{ minWidth: 180 }}
        />
        {row.productSku && (
          <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5 px-1">{row.productSku}</div>
        )}
        {open && results.length > 0 && (
          <div
            className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-[var(--border)]"
            style={{ minWidth: 320, maxHeight: 192, overflowY: 'auto' }}
          >
            {results.map((r, i) => (
              <div
                key={r.id}
                className={`px-3 py-2 cursor-pointer border-b border-[var(--border)] last:border-0 flex items-center justify-between gap-3 ${
                  i === activeIdx ? 'bg-[var(--primary-100)]' : 'hover:bg-[var(--table-hover)]'
                }`}
                onMouseDown={() => selectProduct(r)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="min-w-0">
                  <div className="font-medium text-xs text-[var(--text-primary)] truncate">{r.name}</div>
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">{r.sku} · {r.unit}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-mono">
                    Stok: <span className={r.totalQty <= 0 ? 'text-[var(--danger)] font-semibold' : 'text-[var(--success)] font-semibold'}>{r.totalQty}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[var(--text-muted)]">
                    {(showSellPrice ? r.sellPrice : r.costPrice).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-1 py-1 border-r border-[var(--border)]">
        <input
          ref={qtyInputRef}
          type="number"
          value={row.qty}
          onChange={(e) => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
          onKeyDown={handleQtyKeyDown}
          onFocus={(e) => e.target.select()}
          className="w-full px-2 py-1 text-right font-mono text-xs text-[var(--text-primary)] border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
          style={{ width: 68 }}
          min="0.001" step="1" disabled={disabled || !row.productId}
        />
      </td>
      <td className="px-1 py-1 border-r border-[var(--border)]">
        <input
          ref={priceInputRef}
          type="number"
          value={row.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
          onKeyDown={handlePriceKeyDown}
          onFocus={(e) => e.target.select()}
          className="w-full px-2 py-1 text-right font-mono text-xs text-[var(--text-primary)] border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
          style={{ width: 100 }}
          min="0" step="100" disabled={disabled || !row.productId}
        />
      </td>
      <td className="px-2 py-1 text-right font-mono text-xs font-semibold text-[var(--text-primary)] border-r border-[var(--border)] select-none">
        {row.totalPrice > 0 ? `Rp ${row.totalPrice.toLocaleString('id-ID', { minimumFractionDigits: 0 })}` : '—'}
      </td>
      <td className="px-1 py-1 border-r border-[var(--border)]">
        <input
          ref={notesInputRef}
          type="text"
          value={row.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          onKeyDown={handleNotesKeyDown}
          className="w-full px-2 py-1 text-xs text-[var(--text-primary)] border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
          style={{ width: 112 }}
          disabled={disabled || !row.productId}
        />
      </td>
      <td className="px-1 py-1 text-center">
        <button
          onClick={onDelete}
          disabled={disabled}
          tabIndex={-1}
          className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs w-5 h-5 flex items-center justify-center mx-auto"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}