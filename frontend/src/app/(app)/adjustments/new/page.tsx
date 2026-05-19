'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';

interface AdjustmentItem {
  productId: string;
  productName: string;
  productSku: string;
  binId: string;
  binName: string;
  systemStock: number;
  actualStock: number;
  difference: number;
  notes: string;
}

const adjustmentReasons = [
  'Opname Stok Rutin',
  'Kerusakan Barang',
  'Kadaluarsa',
  'Selisih Pencatatan',
  'Pencurian/Kejahatan',
  'Lainnya',
];

export default function NewAdjustmentPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [saving, setSaving] = useState(false);

  const addItem = (product: Record<string, unknown>, bin: Record<string, unknown>) => {
    const newItem: AdjustmentItem = {
      productId: product.id as string,
      productName: product.label as string,
      productSku: (product.sku as string) || '',
      binId: bin.id as string,
      binName: bin.label as string,
      systemStock: (product.stock as number) || 0,
      actualStock: (product.stock as number) || 0,
      difference: 0,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof AdjustmentItem, value: number | string) => {
    const updated = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    if (field === 'actualStock') {
      updated[index].difference = updated[index].actualStock - updated[index].systemStock;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAdjustment = items.reduce((sum, item) => sum + item.difference, 0);
  const hasNegative = items.some(item => item.difference < 0);

  const buildPayload = (asDraft: boolean) => ({
    reason,
    notes: notes || undefined,
    status: asDraft ? 'DRAFT' : 'SUBMITTED',
    items: items.map(item => ({
      productId: item.productId,
      binId: item.binId,
      systemStock: item.systemStock,
      actualStock: item.actualStock,
      difference: item.difference,
      notes: item.notes || undefined,
    })),
  });

  const createDraftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/adjustments', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'Draft adjustment disimpan');
      router.push('/adjustments');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal membuat adjustment');
      setSaving(false);
    },
  });

  const createAndSubmitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/adjustments', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'Adjustment berhasil diajukan');
      router.push('/adjustments');
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal mengajukan adjustment');
      setSaving(false);
    },
  });

  const handleSubmit = (asDraft = false) => {
    if (!reason) {
      addToast('error', 'Pilih alasan adjustment');
      return;
    }
    if (items.length === 0) {
      addToast('error', 'Tambahkan minimal 1 item');
      return;
    }

    setSaving(true);
    if (asDraft) {
      createDraftMutation.mutate(buildPayload(true));
    } else {
      createAndSubmitMutation.mutate(buildPayload(false));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* ── Sticky Action Toolbar ── */}
      <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 border border-[var(--border)] rounded-none hover:bg-[var(--table-hover)]"
          >
            ← Kembali
          </button>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Stock Opname / Adjustment</h1>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">#PENDING</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/adjustments')}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)]"
          >
            Batal
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {saving && !createAndSubmitMutation.isPending ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving || createAndSubmitMutation.isPending}
            className="px-4 py-1.5 text-xs bg-[var(--primary-700)] text-white rounded-none hover:bg-[var(--primary-900)] disabled:opacity-40"
          >
            {createAndSubmitMutation.isPending ? 'Mengajukan...' : 'Submit Approval'}
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-0">

        {/* ── Adjustment Info Section ── */}
        <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="px-3 py-1.5 bg-[#f4f4f4] border-b border-[var(--border)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Informasi Adjustment</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Alasan *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2"
                >
                  <option value="">Pilih alasan...</option>
                  {adjustmentReasons.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Catatan
                </label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan optional"
                  className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Items Grid Section ── */}
        <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="px-3 py-1.5 bg-[#f4f4f4] border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Item Adjustment</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {items.length} item &middot; Total:{' '}
              <span className={hasNegative ? 'text-[var(--danger)] font-semibold' : 'text-[var(--success)] font-semibold'}>
                {totalAdjustment > 0 ? '+' : ''}{totalAdjustment}
              </span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-[#f4f4f4] z-[5]">
                <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)]">
                  <th className="px-2 py-1.5 font-semibold w-8 text-center border-r border-[var(--border)]">#</th>
                  <th className="px-2 py-1.5 font-semibold border-r border-[var(--border)]" style={{ minWidth: 180 }}>Produk</th>
                  <th className="px-2 py-1.5 font-semibold border-r border-[var(--border)]">Bin</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-20 border-r border-[var(--border)]">Stok Sistem</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-20 border-r border-[var(--border)]">Stok Aktual</th>
                  <th className="px-2 py-1.5 font-semibold text-right w-20 border-r border-[var(--border)]">Selisih</th>
                  <th className="px-2 py-1.5 font-semibold w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      Tambahkan item untuk melakukan adjustment
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--table-hover)]">
                    <td className="px-2 py-1.5 text-center text-[var(--text-muted)] select-none border-r border-[var(--border)]">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <div className="font-medium text-[var(--text-primary)]">{item.productName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.productSku}</div>
                    </td>
                    <td className="px-2 py-1.5 text-[var(--text-secondary)] border-r border-[var(--border)]">{item.binName}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[var(--text-secondary)] border-r border-[var(--border)] select-none">{item.systemStock}</td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <input
                        type="number"
                        value={item.actualStock}
                        onChange={(e) => updateItem(idx, 'actualStock', Number(e.target.value))}
                        className="w-20 px-2 py-1 text-right bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 font-mono"
                      />
                    </td>
                    <td className={`px-2 py-1.5 text-right font-mono font-semibold border-r border-[var(--border)] select-none ${
                      item.difference > 0 ? 'text-[var(--success)]' : item.difference < 0 ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'
                    }`}>
                      {item.difference > 0 ? '+' : ''}{item.difference}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-[var(--text-muted)] hover:text-[var(--danger)] text-xs w-5 h-5 flex items-center justify-center mx-auto hover:bg-red-50 transition-colors"
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
          <div className="p-4 border-t border-[var(--border)]">
            <div className="max-w-xs">
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                Tambah Produk
              </label>
              <SearchAutocomplete
                endpoint="/search/products"
                value=""
                onChange={() => {}}
                onSelect={(item) => {
                  addItem(item as unknown as Record<string, unknown>, { id: 'BIN-001', label: 'Gudang Utama' });
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari produk..."
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}