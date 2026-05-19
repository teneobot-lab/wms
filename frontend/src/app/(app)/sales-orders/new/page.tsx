'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';

interface SOItem {
  productId: string;
  productName: string;
  productSku: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  notes: string;
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [requiredDate, setRequiredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SOItem[]>([]);
  const [saving, setSaving] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales-orders', payload);
      return res.data;
    },
    onSuccess: (data) => {
      addToast('success', 'Draft SO berhasil disimpan');
      router.push(`/sales-orders/${data.data.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal membuat Sales Order');
      setSaving(false);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales-orders', payload);
      const soId = res.data.data.id;
      await api.post(`/sales-orders/${soId}/confirm`);
      return res.data;
    },
    onSuccess: (data) => {
      addToast('success', 'SO berhasil dibuat dan dikonfirmasi');
      router.push(`/sales-orders/${data.data.id}`);
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal mengkonfirmasi Sales Order');
      setSaving(false);
    },
  });

  const addItem = (product: Record<string, unknown>) => {
    const newItem: SOItem = {
      productId: product.id as string,
      productName: product.label as string,
      productSku: (product.sku as string) || '',
      unitName: (product.unit as string) || '',
      quantity: 1,
      unitPrice: (product.sellingPrice as number) || 0,
      total: (product.sellingPrice as number) || 0,
      notes: '',
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof SOItem, value: number | string) => {
    const updated = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);

  const buildPayload = (asDraft: boolean) => ({
    customerId,
    orderDate,
    requiredDate: requiredDate || undefined,
    notes: notes || undefined,
    status: asDraft ? 'DRAFT' : 'CONFIRMED',
    items: items.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes || undefined,
    })),
  });

  const handleSubmit = async (asDraft = false) => {
    if (!customerId) {
      addToast('error', 'Pilih customer terlebih dahulu');
      return;
    }
    if (items.length === 0) {
      addToast('error', 'Tambahkan minimal 1 item');
      return;
    }

    setSaving(true);
    try {
      if (asDraft) {
        createMutation.mutate(buildPayload(true));
      } else {
        confirmMutation.mutate(buildPayload(false));
      }
    } catch {
      setSaving(false);
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
            <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">Sales Order</h1>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">#PENDING</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/sales-orders')}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)]"
          >
            Batal
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-4 py-1.5 text-xs border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-none hover:bg-[var(--table-row-alt)] hover:text-[var(--text-primary)] disabled:opacity-40"
          >
            {saving && !confirmMutation.isPending ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving || confirmMutation.isPending}
            className="px-4 py-1.5 text-xs bg-[var(--primary-700)] text-white rounded-none hover:bg-[var(--primary-900)] disabled:opacity-40"
          >
            {confirmMutation.isPending ? 'Mengonfirmasi...' : 'Konfirmasi Order'}
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
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Customer *
                </label>
                <SearchAutocomplete
                  endpoint="/search/customers"
                  value={customerName}
                  onChange={setCustomerName}
                  onSelect={(item) => {
                    setCustomerId(item.id as string);
                    setCustomerName(item.label);
                  }}
                  fuseKeys={['label', 'secondary']}
                  placeholder="Cari customer..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Tanggal Order *
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                  Tanggal Required
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1 tracking-wide uppercase">
                Keterangan
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 text-sm bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 placeholder:text-[var(--text-muted)]"
                placeholder="Catatan optional untuk order ini"
              />
            </div>
          </div>
        </div>

        {/* ── Items Grid Section ── */}
        <div className="border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="px-3 py-1.5 bg-[#f4f4f4] border-b border-[var(--border)] flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">Item Pesanan</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {items.length} item &middot; Subtotal: Rp {subtotal.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-[#f4f4f4] z-[5]">
                <tr className="text-left text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border)]">
                  <th className="px-2 py-1.5 font-semibold w-8 text-center border-r border-[var(--border)]">#</th>
                  <th className="px-2 py-1.5 font-semibold border-r border-[var(--border)]" style={{ minWidth: 220 }}>Kode / Nama Barang</th>
                  <th className="px-2 py-1.5 font-semibold w-24 text-right border-r border-[var(--border)]">Qty</th>
                  <th className="px-2 py-1.5 font-semibold w-32 text-right border-r border-[var(--border)]">Harga</th>
                  <th className="px-2 py-1.5 font-semibold w-32 text-right border-r border-[var(--border)]">Total</th>
                  <th className="px-2 py-1.5 font-semibold w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-[var(--text-muted)]">
                      Tambahkan item dengan cari produk di bawah
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--table-hover)]">
                    <td className="px-2 py-1.5 text-center text-[var(--text-muted)] select-none border-r border-[var(--border)]">{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <div className="font-medium text-[var(--text-primary)]">{item.productName}</div>
                      <div className="text-[10px] text-[var(--text-muted)] font-mono">{item.productSku} &middot; {item.unitName}</div>
                    </td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2 py-1 text-right bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 font-mono"
                      />
                    </td>
                    <td className="px-2 py-1.5 border-r border-[var(--border)]">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2 py-1 text-right bg-[#f4f4f4] border border-[var(--border)] text-[var(--text-primary)] rounded-none focus:outline-none focus:border-[var(--primary-300)] focus:border-b-2 font-mono"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-[var(--text-primary)] border-r border-[var(--border)] select-none">
                      Rp {item.total.toLocaleString('id-ID')}
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
                  addItem(item as unknown as Record<string, unknown>);
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari produk untuk ditambahkan..."
              />
            </div>
          </div>

          {/* ── Footer Total ── */}
          <div className="px-4 py-3 border-t border-[var(--border)] bg-[#f4f4f4] flex justify-end">
            <div className="text-right">
              <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Subtotal</div>
              <div className="text-base font-semibold font-mono text-[var(--text-primary)]">
                Rp {subtotal.toLocaleString('id-ID', { minimumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}