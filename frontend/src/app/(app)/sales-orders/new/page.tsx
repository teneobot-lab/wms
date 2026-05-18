'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';
import { useToastStore } from '@/stores/uiStore';

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
      await api.post('/sales-orders', {
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
      addToast('success', asDraft ? 'Draft SO berhasil disimpan' : 'SO berhasil dibuat');
      router.push('/sales-orders');
    } catch {
      addToast('error', 'Gagal membuat Sales Order');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Buat Sales Order Baru</h1>
          <p className="text-xs text-gray-500">Pilih customer dan tambahkan item pesanan</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Batal
          </button>
          <button onClick={() => handleSubmit(true)} disabled={saving} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            {saving ? '...' : 'Simpan Draft'}
          </button>
          <button onClick={() => handleSubmit(false)} disabled={saving} className="px-4 py-1.5 text-sm bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A]">
            {saving ? '...' : 'Konfirmasi Order'}
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Informasi Order</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Customer *</label>
              <SearchAutocomplete
                endpoint="/search/customers"
                value={customerName}
                onChange={setCustomerName}
                onSelect={(item) => {
                  setCustomerId(item.id);
                  setCustomerName(item.label);
                }}
                fuseKeys={['label', 'secondary']}
                placeholder="Cari customer..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Order *</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tanggal Required</label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
              placeholder="Catatan optional untuk order ini"
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Item Pesanan</h3>
          <div className="text-xs text-gray-500">
            {items.length} item
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium w-8">#</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium w-24 text-right">Qty</th>
                <th className="px-3 py-2 font-medium w-32 text-right">Harga</th>
                <th className="px-3 py-2 font-medium w-32 text-right">Total</th>
                <th className="px-3 py-2 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    Tambahkan item dengan cari produk di bawah
                  </td>
                </tr>
              ) : items.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-sm">{item.productName}</div>
                    <div className="text-xs text-gray-400">{item.productSku} • {item.unitName}</div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-full px-2 py-1 text-sm text-right border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    Rp {item.total.toLocaleString('id-ID')}
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
              placeholder="Cari produk untuk ditambahkan..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <div className="text-right">
            <div className="text-xs text-gray-500">Subtotal</div>
            <div className="text-lg font-semibold font-mono">Rp {subtotal.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}