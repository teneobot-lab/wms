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
    if (!supplier) { addToast('warning', 'Please select a supplier.'); return; }
    const validItems = rows.filter(r => r.productId && r.qty > 0);
    if (validItems.length === 0) { addToast('warning', 'Please add at least one product.'); return; }
    setSubmitting(true);
    createMutation.mutate(buildPayload(true));
  };

  const handleSubmit = () => {
    if (!supplier) { addToast('warning', 'Please select a supplier.'); return; }
    const validItems = rows.filter(r => r.productId && r.qty > 0);
    if (validItems.length === 0) { addToast('warning', 'Please add at least one product.'); return; }
    setSubmitting(true);
    submitMutation.mutate(buildPayload(false));
  };

  const totalAmount = rows.reduce((sum, r) => sum + r.totalPrice, 0);
  const validCount = rows.filter(r => r.productId).length;

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
            <h1 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-wide">Purchase Order</h1>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">#PENDING</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/purchase-orders')}
            className="px-4 py-1.5 text-[12px] text-[var(--text-secondary)] border border-[var(--border)] bg-white hover:border-[var(--primary-500)] hover:text-[var(--primary-700)]"
          >
            Batal
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={submitting}
            className="px-4 py-1.5 text-[12px] text-[var(--text-secondary)] border border-[var(--border)] bg-white hover:border-[var(--primary-500)] hover:text-[var(--primary-700)] disabled:opacity-40"
          >
            Simpan Draft
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || submitMutation.isPending}
            className="px-4 py-1.5 text-[12px] bg-[var(--primary-700)] text-white hover:bg-[var(--primary-900)] disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="max-w-6xl mx-auto px-4 py-5 space-y-0">

        {/* ── Order Info Section ── */}
        <div className="border border-[var(--border)] bg-white">
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--table-header)]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)]">Informasi Order</span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                  Supplier *
                </label>
                <SearchAutocomplete
                  endpoint="/search/suppliers"
                  placeholder=""
                  value={supplier?.name || ''}
                  onSelect={(item) => setSupplier(item)}
                  fuseKeys={['label', 'secondary']}
                  renderOption={(item) => (
                    <div>
                      <div className="text-sm text-[var(--text-primary)]">{item.label}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{item.secondary}</div>
                    </div>
                  )}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                  Tanggal Expected
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--text-primary)] bg-white focus:outline-none focus:border-[var(--primary-500)]"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5">
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-2 tracking-wide uppercase">
                Keterangan
              </label>
              <textarea
                className="w-full px-3 py-1.5 text-sm border border-[var(--border)] text-[var(--text-primary)] bg-white focus:outline-none focus:border-[var(--primary-500)] resize-none"
                style={{ height: 52 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Line Items Section ── */}
        <RapidEntryGrid rows={rows} onChange={setRows} disabled={submitting} />

      </div>
    </div>
  );
}