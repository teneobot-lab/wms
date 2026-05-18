'use client';

import { useState, useRef, useEffect } from 'react';
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

interface RapidEntryGridProps {
  rows: RapidEntryRow[];
  onChange: (rows: RapidEntryRow[]) => void;
  disabled?: boolean;
  productEndpoint?: string;
}

export function RapidEntryGrid({
  rows,
  onChange,
  disabled = false,
  productEndpoint = '/search/products',
}: RapidEntryGridProps) {
  const [activeCell, setActiveCell] = useState<{ row: number; col: string } | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();

  const addRow = () => {
    const newRow: RapidEntryRow = {
      id: `row-${Date.now()}`,
      productId: '',
      productLabel: '',
      productSku: '',
      qty: 1,
      unitPrice: 0,
      totalPrice: 0,
      notes: '',
    };
    onChange([...rows, newRow]);
  };

  const updateRow = (index: number, field: keyof RapidEntryRow, value: unknown) => {
    const updated = [...rows];
    (updated[index] as any)[field] = value;
    if (field === 'qty' || field === 'unitPrice') {
      updated[index].totalPrice = Number(updated[index].qty) * Number(updated[index].unitPrice);
    }
    onChange(updated);
  };

  const deleteRow = (index: number) => {
    if (rows[index].productId === '' && rows[index].qty === 1 && rows[index].unitPrice === 0) {
      const updated = rows.filter((_, i) => i !== index);
      onChange(updated.length ? updated : [emptyRow()]);
    }
  };

  const emptyRow = (): RapidEntryRow => ({
    id: `row-${Date.now()}`,
    productId: '',
    productLabel: '',
    productSku: '',
    qty: 1,
    unitPrice: 0,
    totalPrice: 0,
    notes: '',
  });

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, col: string) => {
    const cols = ['product', 'qty', 'price', 'notes'];
    const colIndex = cols.indexOf(col);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          if (colIndex > 0) {
            setActiveCell({ row: rowIndex, col: cols[colIndex - 1] });
          } else if (rowIndex > 0) {
            setActiveCell({ row: rowIndex - 1, col: cols[cols.length - 1] });
          }
        } else {
          if (colIndex < cols.length - 1) {
            setActiveCell({ row: rowIndex, col: cols[colIndex + 1] });
          } else {
            // Add new row on Tab from last cell
            if (rowIndex === rows.length - 1 && rows[rowIndex].productId) {
              addRow();
              setTimeout(() => setActiveCell({ row: rowIndex + 1, col: 'product' }), 50);
            } else {
              setActiveCell({ row: rowIndex, col: cols[0] });
            }
          }
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (rowIndex < rows.length - 1) {
          setActiveCell({ row: rowIndex + 1, col });
        } else if (rows[rowIndex].productId) {
          addRow();
          setTimeout(() => setActiveCell({ row: rowIndex + 1, col: 'product' }), 50);
        }
        break;
      case 'Backspace':
        if ((e.target as HTMLInputElement).value === '' && rowIndex > 0) {
          setActiveCell({ row: rowIndex - 1, col });
        }
        break;
      case 'd':
        if (e.ctrlKey) {
          e.preventDefault();
          const newRow = { ...rows[rowIndex], id: `row-${Date.now()}` };
          onChange([...rows, newRow]);
          addToast('info', 'Row duplicated');
        }
        break;
      case '?':
        setShowShortcuts(prev => !prev);
        break;
    }
  };

  // Auto-select on focus
  const handleFocus = (e: React.FocusEvent) => {
    (e.target as HTMLInputElement).select();
  };

  // Product search (simple inline)
  const ProductSearch = ({ rowIndex, value }: { rowIndex: number; value: string }) => {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const search = async (q: string) => {
      if (q.length < 1) { setResults([]); setOpen(false); return; }
      try {
        const res = await api.get(`${productEndpoint}?q=${q}`);
        setResults(res.data.data || []);
        setOpen(true);
      } catch { setResults([]); }
    };

    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            updateRow(rowIndex, 'productLabel', e.target.value);
            updateRow(rowIndex, 'productId', '');
            search(e.target.value);
          }}
          onKeyDown={(e) => handleKeyDown(e, rowIndex, 'product')}
          onFocus={() => value.length > 1 && search(value)}
          className="input text-xs w-full"
          placeholder="SKU or Name..."
          disabled={disabled}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {open && results.length > 0 && (
          <div className="absolute left-0 top-full mt-1 z-20 bg-bg-surface border border-border rounded shadow-lg w-72 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <div
                key={r.id}
                className="px-3 py-2 text-xs cursor-pointer hover:bg-table-hover border-b border-bg-elevated last:border-0"
                onMouseDown={() => {
                  updateRow(rowIndex, 'productId', r.id);
                  updateRow(rowIndex, 'productLabel', r.name);
                  updateRow(rowIndex, 'productSku', r.sku);
                  updateRow(rowIndex, 'unitPrice', r.costPrice);
                  updateRow(rowIndex, 'qty', 1);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{r.name}</div>
                <div className="text-text-muted text-[10px] font-mono">{r.sku} · {r.unit} · Stock: {r.totalQty}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalAmount = rows.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <div className="relative">
      {/* Shortcuts help */}
      {showShortcuts && (
        <div className="absolute inset-0 bg-black/40 z-30 flex items-center justify-center">
          <div className="bg-bg-surface border border-border rounded-lg p-4 shadow-lg text-xs">
            <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-secondary">
              <span className="text-text-muted">Tab</span><span>Next cell</span>
              <span className="text-text-muted">Enter</span><span>Next row</span>
              <span className="text-text-muted">Shift+Tab</span><span>Previous cell</span>
              <span className="text-text-muted">Ctrl+D</span><span>Duplicate row</span>
              <span className="text-text-muted">Del</span><span>Remove empty row</span>
              <span className="text-text-muted">?</span><span>Toggle help</span>
            </div>
            <button onClick={() => setShowShortcuts(false)} className="mt-3 btn btn-secondary btn-sm">Close</button>
          </div>
        </div>
      )}

      <div ref={gridRef} className="card">
        <div className="card-header flex items-center justify-between">
          <span className="text-xs font-semibold">Line Items</span>
          <button onClick={() => setShowShortcuts(true)} className="text-text-muted text-xs hover:text-text-primary">
            Press ? for shortcuts
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-table-header border-b border-border">
                <th className="px-2 py-2 text-left text-text-muted font-semibold w-8">#</th>
                <th className="px-2 py-2 text-left text-text-muted font-semibold">Product (SKU / Name)</th>
                <th className="px-2 py-2 text-right text-text-muted font-semibold w-20">Qty</th>
                <th className="px-2 py-2 text-right text-text-muted font-semibold w-24">Unit Price</th>
                <th className="px-2 py-2 text-right text-text-muted font-semibold w-28">Total</th>
                <th className="px-2 py-2 text-left text-text-muted font-semibold w-32">Notes</th>
                <th className="px-2 py-2 text-center text-text-muted font-semibold w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="border-b border-border hover:bg-table-hover">
                  <td className="px-2 py-1 text-text-muted text-center">{index + 1}</td>
                  <td className="px-2 py-1">
                    <ProductSearch rowIndex={index} value={row.productLabel} />
                    {row.productSku && (
                      <div className="text-[10px] text-text-muted font-mono mt-0.5">{row.productSku}</div>
                    )}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row.qty}
                      onChange={(e) => updateRow(index, 'qty', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'qty')}
                      onFocus={handleFocus}
                      className="input text-right font-mono"
                      style={{ width: 72 }}
                      min="0.001"
                      step="0.001"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'price')}
                      onFocus={handleFocus}
                      className="input text-right font-mono"
                      style={{ width: 96 }}
                      min="0"
                      step="100"
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-2 py-1 text-right font-mono font-semibold text-text-primary">
                    {row.totalPrice.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(index, 'notes', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index, 'notes')}
                      className="input text-xs"
                      placeholder="Optional..."
                      disabled={disabled}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => deleteRow(index)}
                      className="text-text-muted hover:text-danger text-xs"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-table-header">
                <td colSpan={4} className="px-2 py-2 text-right font-semibold text-sm">TOTAL:</td>
                <td className="px-2 py-2 text-right font-mono font-bold text-lg text-primary-900">
                  {totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
                </td>
                <td colSpan={2}>
                  <button
                    onClick={addRow}
                    className="btn btn-secondary btn-sm text-xs w-full"
                    disabled={disabled}
                  >
                    + Add Row
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}