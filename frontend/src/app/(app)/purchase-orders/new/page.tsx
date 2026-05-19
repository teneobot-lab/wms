'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';
import { RapidEntryGrid, type RapidEntryRow } from '@/components/form/RapidEntryGrid';

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [rows, setRows] = useState<RapidEntryRow[]>([
    { id: 'row-1', productId: '', productLabel: '', productSku: '', qty: 1, unitPrice: 0, totalPrice: 0, notes: '' },
  ]);
  const [supplier, setSupplier] = useState<any>(null);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/purchase-orders', payload);
      return res.data;
    },
    onSuccess: (data) => {
      addToast('success', 'Purchase order created successfully!');
      router.push(`/purchase-orders/${data.data.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to create PO');
      setSubmitting(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/purchase-orders', payload);
      const poId = res.data.data.id;
      await api.post(`/purchase-orders/${poId}/submit`);
      return res.data;
    },
    onSuccess: (data) => {
      addToast('success', 'Purchase order submitted successfully!');
      router.push(`/purchase-orders/${data.data.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Failed to submit PO');
      setSubmitting(false);
    },
  });

  const buildPayload = (asDraft: boolean) => {
    const validItems = rows.filter(r => r.productId && r.qty > 0);
    return {
      supplierId: supplier.id,
      expectedDate: expectedDate || undefined,
      notes: notes || undefined,
      status: asDraft ? 'DRAFT' : 'SUBMITTED',
      items: validItems.map(r => ({
        productId: r.productId,
        qtyOrdered: r.qty,
        unitPrice: r.unitPrice,
        notes: r.notes || undefined,
      })),
    };
  };

  const handleSaveDraft = () => {
    if (!supplier) {
      addToast('warning', 'Please select a supplier.');
      return;
    }
    const validItems = rows.filter(r => r.productId && r.qty > 0);
    if (validItems.length === 0) {
      addToast('warning', 'Please add at least one product.');
      return;
    }

    setSubmitting(true);
    createMutation.mutate(buildPayload(true));
  };

  const handleSubmit = () => {
    if (!supplier) {
      addToast('warning', 'Please select a supplier.');
      return;
    }
    const validItems = rows.filter(r => r.productId && r.qty > 0);
    if (validItems.length === 0) {
      addToast('warning', 'Please add at least one product.');
      return;
    }

    setSubmitting(true);
    submitMutation.mutate(buildPayload(false));
  };

  const totalAmount = rows.reduce((sum, r) => sum + r.totalPrice, 0);

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
            <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Purchase Order</h1>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">#PENDING</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/purchase-orders')}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)]"
          >
            Batal
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={submitting}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {submitting && !submitMutation.isPending ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitMutation.isPending}
            className="px-4 py-1.5 text-xs bg-[var(--primary-700)] text-white rounded-none hover:bg-[var(--primary-900)] disabled:opacity-40"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-0">

        {/* ── Order Info Section ── */}
        <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="px-3 py-1.5 bg-[#f4f4f4] border-b border-[var(--border)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Informasi Order</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Supplier *
                </label>
                <SearchAutocomplete
                  endpoint="/search/suppliers"
                  placeholder="Cari supplier..."
                  value={supplier?.name || ''}
                  onSelect={(item) => setSupplier(item)}
                  fuseKeys={['label', 'secondary']}
                  renderOption={(item) => (
                    <div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">{item.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{item.secondary}</div>
                    </div>
                  )}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Tanggal Expected
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 placeholder:text-[var(--text-muted)]"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                Keterangan
              </label>
              <textarea
                className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 placeholder:text-[var(--text-muted)]"
                style={{ height: 56 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan internal, instruksi pengiriman..."
              />
            </div>
          </div>
        </div>

        {/* ── Line Items Section ── */}
        <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="px-3 py-1.5 bg-[#f4f4f4] border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Detail Barang</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {rows.filter(r => r.productId).length} item &middot; Total: Rp {totalAmount.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
            </span>
          </div>
          <RapidEntryGrid rows={rows} onChange={setRows} disabled={submitting} />
        </div>

      </div>
    </div>
  );
}