'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';

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

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between py-2 px-3">
        <span className="text-xs font-semibold text-text-primary">Detail Barang</span>
        <span className="text-[10px] text-text-muted">
          Enter: pilih &amp; fokus qty · ↓/Enter di qty: baris baru
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-table-header border-b border-border">
              <th className="px-2 py-1.5 text-center text-text-muted font-semibold w-8 border-r border-border">#</th>
              <th className="px-2 py-1.5 text-left text-text-muted font-semibold border-r border-border" style={{ minWidth: 220 }}>Kode / Nama Barang</th>
              <th className="px-2 py-1.5 text-right text-text-muted font-semibold w-20 border-r border-border">Qty</th>
              <th className="px-2 py-1.5 text-right text-text-muted font-semibold w-28 border-r border-border">Harga Satuan</th>
              <th className="px-2 py-1.5 text-right text-text-muted font-semibold w-28 border-r border-border">Total</th>
              <th className="px-2 py-1.5 text-left text-text-muted font-semibold w-32 border-r border-border">Keterangan</th>
              <th className="px-2 py-1.5 w-8"></th>
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
            <tr className="bg-table-header border-t-2 border-border">
              <td colSpan={4} className="px-3 py-2 text-right text-xs font-semibold text-text-secondary">TOTAL</td>
              <td className="px-2 py-2 text-right font-mono font-bold text-sm text-text-primary">
                {totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
              </td>
              <td colSpan={2} className="px-2 py-1.5">
                <button onClick={addRow} disabled={disabled} className="btn btn-secondary btn-sm text-xs w-full">
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
  const [searching, setSearching] = useState(false);

  const qtyInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(row.productLabel); }, [row.productLabel]);

  const searchProducts = useCallback(async (q: string) => {
    if (!q || q.trim().length < 1) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await api.get(`${productEndpoint}?q=${encodeURIComponent(q)}`);
      const data: ProductResult[] = res.data.data || [];
      setResults(data);
      setOpen(data.length > 0);
      setActiveIdx(0);
    } catch { setResults([]); }
    finally { setSearching(false); }
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
    if (e.key === 'Tab' && !e.shiftKey) { /* natural tab to price */ }
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
    <tr className="border-b border-border hover:bg-table-hover">
      <td className="px-2 py-1 text-center text-text-muted border-r border-border select-none">{index + 1}</td>
      <td className="px-1 py-1 border-r border-border relative">
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
          placeholder="Kode / Nama Barang..."
          disabled={disabled}
          className="input text-xs w-full"
          autoComplete="off"
          style={{ minWidth: 180 }}
        />
        {row.productSku && (
          <div className="text-[10px] text-text-muted font-mono mt-0.5 px-1">{row.productSku}</div>
        )}
        {searching && <div className="absolute right-3 top-2 text-text-muted text-[10px]">...</div>}
        {open && results.length > 0 && (
          <div className="absolute left-0 top-full mt-0.5 z-50 bg-bg-surface border border-border rounded shadow-lg overflow-hidden" style={{ minWidth: 320, maxHeight: 240, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <div
                key={r.id}
                className={`px-3 py-2 cursor-pointer border-b border-bg-elevated last:border-0 flex items-center justify-between gap-2 ${i === activeIdx ? 'bg-primary-50 text-primary-900' : 'hover:bg-table-hover'}`}
                onMouseDown={() => selectProduct(r)}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="min-w-0">
                  <div className="font-medium text-xs truncate">{r.name}</div>
                  <div className="text-[10px] text-text-muted font-mono">{r.sku} · {r.unit}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] font-mono">
                    Stok: <span className={r.totalQty <= 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>{r.totalQty}</span>
                  </div>
                  <div className="text-[10px] font-mono text-text-muted">
                    {(showSellPrice ? r.sellPrice : r.costPrice).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-1 py-1 border-r border-border">
        <input ref={qtyInputRef} type="number" value={row.qty}
          onChange={(e) => onUpdate({ qty: parseFloat(e.target.value) || 0 })}
          onKeyDown={handleQtyKeyDown} onFocus={(e) => e.target.select()}
          className="input text-right font-mono text-xs" style={{ width: 68 }}
          min="0.001" step="1" disabled={disabled || !row.productId} />
      </td>
      <td className="px-1 py-1 border-r border-border">
        <input ref={priceInputRef} type="number" value={row.unitPrice}
          onChange={(e) => onUpdate({ unitPrice: parseFloat(e.target.value) || 0 })}
          onKeyDown={handlePriceKeyDown} onFocus={(e) => e.target.select()}
          className="input text-right font-mono text-xs" style={{ width: 100 }}
          min="0" step="100" disabled={disabled || !row.productId} />
      </td>
      <td className="px-2 py-1 text-right font-mono text-xs font-semibold text-text-primary border-r border-border select-none">
        {row.totalPrice > 0 ? row.totalPrice.toLocaleString('id-ID', { minimumFractionDigits: 0 }) : '-'}
      </td>
      <td className="px-1 py-1 border-r border-border">
        <input ref={notesInputRef} type="text" value={row.notes}
          onChange={(e) => onUpdate({ notes: e.target.value })}
          onKeyDown={handleNotesKeyDown}
          className="input text-xs" style={{ width: 112 }}
          placeholder="Keterangan..." disabled={disabled || !row.productId} />
      </td>
      <td className="px-1 py-1 text-center">
        <button onClick={onDelete} disabled={disabled} tabIndex={-1}
          className="text-text-muted hover:text-danger text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-danger/10 transition-colors mx-auto">
          ✕
        </button>
      </td>
    </tr>
  );
}
