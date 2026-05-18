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
    onSuccess: (data) => {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Stock Opname / Adjustment</h1>
          <p className="text-xs text-gray-500">Lakukan penyesuaian stok jika ada selisih</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Batal
          </button>
          <button onClick={() => handleSubmit(true)} disabled={saving} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            {saving && !createAndSubmitMutation.isPending ? '...' : 'Simpan Draft'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving || createAndSubmitMutation.isPending} className="px-4 py-1.5 text-sm bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A] disabled:opacity-50">
            {createAndSubmitMutation.isPending ? '...' : 'Submit Approval'}
          </button>
        </div>
      </div>

      {/* Adjustment Info */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Informasi Adjustment</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alasan *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
              >
                <option value="">Pilih alasan...</option>
                {adjustmentReasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan optional"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Item Adjustment</h3>
          <div className="text-xs text-gray-500">
            {items.length} item • Total: <span className={hasNegative ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
              {totalAdjustment > 0 ? '+' : ''}{totalAdjustment}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium w-8">#</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium">Bin</th>
                <th className="px-3 py-2 font-medium text-right">Stok Sistem</th>
                <th className="px-3 py-2 font-medium text-right">Stok Aktual</th>
                <th className="px-3 py-2 font-medium text-right">Selisih</th>
                <th className="px-3 py-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    Tambahkan item untuk melakukan adjustment
                  </td>
                </tr>
              ) : items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-400">{item.productSku}</div>
                  </td>
                  <td className="px-3 py-2 text-sm">{item.binName}</td>
                  <td className="px-3 py-2 text-right font-mono">{item.systemStock}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.actualStock}
                      onChange={(e) => updateItem(idx, 'actualStock', Number(e.target.value))}
                      className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] font-mono"
                    />
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-medium ${
                    item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {item.difference > 0 ? '+' : ''}{item.difference}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-red-500 text-sm">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Item */}
        <div className="p-4 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tambah Produk</label>
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
  );
}