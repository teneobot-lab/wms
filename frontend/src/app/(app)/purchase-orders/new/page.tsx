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

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn btn-secondary btn-icon btn-sm">←</button>
          <h1 className="text-lg font-semibold text-text-primary">New Purchase Order</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/purchase-orders')} className="btn btn-secondary btn-default">Cancel</button>
          <button onClick={handleSaveDraft} disabled={submitting} className="btn btn-secondary btn-default">
            {submitting && !submitMutation.isPending ? 'Saving...' : 'Simpan Draft'}
          </button>
          <button onClick={handleSubmit} disabled={submitting || submitMutation.isPending} className="btn btn-primary btn-default">
            {submitMutation.isPending ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>

      {/* PO Info */}
      <div className="card">
        <div className="card-header"><span className="text-xs font-semibold">Order Details</span></div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label block mb-1">Supplier *</label>
              <SearchAutocomplete
                endpoint="/search/suppliers"
                placeholder="Search supplier..."
                value={supplier?.name || ''}
                onSelect={(item) => setSupplier(item)}
                fuseKeys={['label', 'secondary']}
                renderOption={(item) => (
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="text-xs text-text-muted">{item.secondary}</div>
                  </div>
                )}
              />
            </div>
            <div>
              <label className="label block mb-1">Expected Delivery Date</label>
              <input
                type="date"
                className="input"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="label block mb-1">Notes</label>
              <textarea
                className="input"
                style={{ height: 60, paddingTop: 6 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes, delivery instructions..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <RapidEntryGrid rows={rows} onChange={setRows} disabled={submitting} />
    </div>
  );
}