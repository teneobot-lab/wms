'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';

interface TransferItem {
  productId: string;
  productName: string;
  productSku: string;
  fromBinId: string;
  fromBinName: string;
  toBinId: string;
  toBinName: string;
  quantity: number;
  notes: string;
}

export default function NewTransferPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [fromBinId, setFromBinId] = useState('');
  const [fromBinName, setFromBinName] = useState('');
  const [toBinId, setToBinId] = useState('');
  const [toBinName, setToBinName] = useState('');
  const [items, setItems] = useState<TransferItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addItem = (product: Record<string, unknown>) => {
    const newItem: TransferItem = {
      productId: product.id as string,
      productName: product.label as string,
      productSku: (product.sku as string) || '',
      fromBinId,
      fromBinName,
      toBinId,
      toBinName,
      quantity: 1,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof TransferItem, value: number | string) => {
    const updated = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/transfers', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'Transfer berhasil');
      router.push('/transfers');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal memproses transfer');
      setSaving(false);
    },
  });

  const handleSubmit = async () => {
    if (!fromBinId || !toBinId) { addToast('error', 'Pilih bin asal dan tujuan'); return; }
    if (fromBinId === toBinId) { addToast('error', 'Bin asal dan tujuan tidak boleh sama'); return; }
    if (items.length === 0) { addToast('error', 'Tambahkan minimal 1 item'); return; }
    const invalidItems = items.filter(item => !item.productId || item.quantity <= 0);
    if (invalidItems.length > 0) { addToast('error', 'Semua item harus memiliki produk dan jumlah > 0'); return; }

    setSaving(true);
    createMutation.mutate({
      sourceBinId: fromBinId,
      destinationBinId: toBinId,
      notes: '',
      items: items.map(item => ({
        productId: item.productId,
        qty: item.quantity,
        notes: item.notes || undefined,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* ── Sticky Action Toolbar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1 border border-[var(--border)] bg-white hover:border-[var(--primary-500)]"
          >
            ← Kembali
          </button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <div>
            <h1 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-wide">Transfer Bin-to-Bin</h1>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">#PENDING</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/transfers')}
            className="px-4 py-1.5 text-[12px] text-[var(--text-secondary)] border border-[var(--border)] bg-white hover:border-[var(--primary-500)] hover:text-[var(--primary-700)]"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-1.5 text-[12px] bg-[var(--primary-700)] text-white hover:bg-[var(--primary-900)] disabled:opacity-40"
          >
            Prosas Transfer
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-0">

        {/* ── Transfer Info Section ── */}
        <div className="border border-[var(--border)] bg-white">
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--table-header)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Informasi Transfer</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                  Dari Bin (Sumber) *
                </label>
                <SearchAutocomplete
                  endpoint="/search/bins"
                  value={fromBinName}
                  onChange={setFromBinName}
                  onSelect={(item) => { setFromBinId(item.id as string); setFromBinName(item.label as string); }}
                  fuseKeys={['label', 'secondary']}
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                  Ke Bin (Tujuan) *
                </label>
                <SearchAutocomplete
                  endpoint="/search/bins"
                  value={toBinName}
                  onChange={setToBinName}
                  onSelect={(item) => { setToBinId(item.id as string); setToBinName(item.label as string); }}
                  fuseKeys={['label', 'secondary']}
                  placeholder=""
                />
              </div>
            </div>
            {fromBinId && toBinId && fromBinId === toBinId && (
              <div className="mt-3 text-xs text-[var(--danger)] font-medium">
                Bin asal dan tujuan tidak boleh sama
              </div>
            )}
          </div>
        </div>

        {/* ── Items Grid Section ── */}
        <div className="border border-[var(--border)] bg-white">
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--table-header)] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Item Transfer</span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {items.length} item &middot; Total Qty: <span className="font-mono font-semibold text-[var(--text-primary)]">{totalQty}</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)] bg-[var(--table-header)]">
                  <th className="px-2 py-2 font-semibold w-8 text-center border-r border-[var(--border)]">#</th>
                  <th className="px-2 py-2 font-semibold border-r border-[var(--border)]" style={{ minWidth: 240 }}>Kode / Nama Barang</th>
                  <th className="px-2 py-2 font-semibold w-24 text-right border-r border-[var(--border)]">Qty</th>
                  <th className="px-2 py-2 font-semibold w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-[var(--text-muted)] text-xs">
                      {fromBinId && toBinId && fromBinId !== toBinId
                        ? 'Tambahkan produk untuk ditransfer'
                        : 'Pilih bin asal dan tujuan terlebih dahulu'}
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--table-hover)]">
                    <td className="px-2 py-1.5 text-center text-[var(--text-muted)] select-none border-r border-[var(--border)] text-[10px]">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <div className="font-medium text-[var(--text-primary)]">{item.productName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.productSku}</div>
                    </td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-24 px-2 py-1 text-right font-mono text-xs text-[var(--text-primary)] border border-[var(--border)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs w-5 h-5 flex items-center justify-center mx-auto"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Add Product ── */}
          {fromBinId && toBinId && fromBinId !== toBinId && (
            <div className="p-5 border-t border-[var(--border)]">
              <div className="max-w-xs">
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                  Tambah Produk
                </label>
                <SearchAutocomplete
                  endpoint="/search/products"
                  value=""
                  onChange={() => {}}
                  onSelect={(item) => { addItem(item as unknown as Record<string, unknown>); }}
                  fuseKeys={['label', 'secondary']}
                  placeholder=""
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}