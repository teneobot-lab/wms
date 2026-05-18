'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';
import { useToastStore } from '@/stores/uiStore';

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

  const handleSubmit = async () => {
    if (!fromBinId || !toBinId) {
      addToast('error', 'Pilih bin asal dan tujuan');
      return;
    }
    if (items.length === 0) {
      addToast('error', 'Tambahkan minimal 1 item');
      return;
    }
    if (fromBinId === toBinId) {
      addToast('error', 'Bin asal dan tujuan tidak boleh sama');
      return;
    }

    setSaving(true);
    try {
      await api.post('/transfers', {
        fromBinId,
        toBinId,
        notes: '',
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      });
      addToast('success', 'Transfer berhasil diproses');
      router.push('/transfers');
    } catch {
      addToast('error', 'Gagal memproses transfer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Transfer Bin-to-Bin</h1>
          <p className="text-xs text-gray-500">Pindahkan stok antar bin/gudang</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving} className="px-4 py-1.5 text-sm bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A]">
            {saving ? 'Memproses...' : 'Proses Transfer'}
          </button>
        </div>
      </div>

      {/* Transfer Info */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Informasi Transfer</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Dari Bin (Sumber) *</label>
              <SearchAutocomplete
                endpoint="/search/bins"
                value={fromBinName}
                onChange={setFromBinName}
                onSelect={(item) => {
                  setFromBinId(item.id);
                  setFromBinName(item.label);
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari bin asal..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ke Bin (Tujuan) *</label>
              <SearchAutocomplete
                endpoint="/search/bins"
                value={toBinName}
                onChange={setToBinName}
                onSelect={(item) => {
                  setToBinId(item.id);
                  setToBinName(item.label);
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari bin tujuan..."
              />
            </div>
          </div>

          {fromBinId && toBinId && fromBinId === toBinId && (
            <div className="mt-3 text-xs text-red-600">
              ⚠ Bin asal dan tujuan tidak boleh sama
            </div>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Item Transfer</h3>
          <div className="text-xs text-gray-500">
            {items.length} item • Total Qty: <span className="font-medium">{totalQty}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium w-8">#</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium text-right">Qty</th>
                <th className="px-3 py-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                    Tambahkan produk untuk ditransfer
                  </td>
                </tr>
              ) : items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-400">{item.productSku}</div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-24 px-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] font-mono"
                    />
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

        {/* Add Item - only show if both bins are selected */}
        {fromBinId && toBinId && fromBinId !== toBinId && (
          <div className="p-4 border-t border-gray-200">
            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tambah Produk</label>
              <SearchAutocomplete
                endpoint="/search/products"
                value=""
                onChange={() => {}}
                onSelect={(item) => {
                  addItem(item as unknown as Record<string, unknown>);
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari produk untuk ditransfer..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}