'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';
import { useToastStore } from '@/stores/uiStore';

interface ProductForm {
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unitId: string;
  unitName: string;
  description: string;
  purchasePrice: number;
  sellingPrice: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  weight: number;
  dimensions: string;
  isActive: boolean;
}

const emptyForm: ProductForm = {
  sku: '',
  barcode: '',
  name: '',
  categoryId: '',
  categoryName: '',
  unitId: '',
  unitName: '',
  description: '',
  purchasePrice: 0,
  sellingPrice: 0,
  minStock: 0,
  maxStock: 0,
  reorderPoint: 0,
  weight: 0,
  dimensions: '',
  isActive: true,
};

export default function NewProductPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (saveAndNew = false) => {
    if (!form.name || !form.categoryId || !form.unitId) {
      addToast('error', 'Lengkapi field yang wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/products', {
        sku: form.sku || undefined,
        barcode: form.barcode || undefined,
        name: form.name,
        categoryId: form.categoryId,
        unitId: form.unitId,
        description: form.description || undefined,
        purchasePrice: form.purchasePrice,
        sellingPrice: form.sellingPrice,
        minStock: form.minStock,
        maxStock: form.maxStock || undefined,
        reorderPoint: form.reorderPoint || undefined,
        weight: form.weight || undefined,
        dimensions: form.dimensions || undefined,
        isActive: form.isActive,
      });

      addToast('success', 'Produk berhasil dibuat');
      if (saveAndNew) {
        setForm(emptyForm);
      } else {
        router.push('/products');
      }
    } catch {
      addToast('error', 'Gagal membuat produk');
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Tambah Produk Baru</h1>
          <p className="text-xs text-gray-500">Lengkapi informasi produk di bawah</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Batal
          </button>
          <button onClick={() => handleSubmit(true)} disabled={loading} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
            Simpan & Baru
          </button>
          <button onClick={() => handleSubmit(false)} disabled={loading} className="px-4 py-1.5 text-sm bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A]">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Left - Form Fields */}
        <div className="col-span-8 space-y-4">
          <div className="bg-white border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Informasi Produk</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SKU *</label>
                  <input
                    value={form.sku}
                    onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                    placeholder="AUTO-GENERATE"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label>
                  <input
                    value={form.barcode}
                    onChange={(e) => updateField('barcode', e.target.value)}
                    placeholder="Scan atau ketik"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nama Produk *</label>
                <input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Ketik nama produk"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Kategori *</label>
                  <SearchAutocomplete
                    endpoint="/search/categories"
                    value=""
                    onChange={() => {}}
                    onSelect={(item) => updateField('categoryId', item.id)}
                    fuseKeys={['label']}
                    placeholder="Cari kategori..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Satuan *</label>
                  <SearchAutocomplete
                    endpoint="/search/units"
                    value=""
                    onChange={() => {}}
                    onSelect={(item) => updateField('unitId', item.id)}
                    fuseKeys={['label']}
                    placeholder="Cari satuan..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Harga</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Harga Beli *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Rp</span>
                    <input
                      type="number"
                      value={form.purchasePrice || ''}
                      onChange={(e) => updateField('purchasePrice', Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] text-right"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Harga Jual *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Rp</span>
                    <input
                      type="number"
                      value={form.sellingPrice || ''}
                      onChange={(e) => updateField('sellingPrice', Number(e.target.value))}
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] text-right"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Stock & Logistik</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok Minimum *</label>
                  <input
                    type="number"
                    value={form.minStock || ''}
                    onChange={(e) => updateField('minStock', Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] text-right"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stok Maksimum</label>
                  <input
                    type="number"
                    value={form.maxStock || ''}
                    onChange={(e) => updateField('maxStock', Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reorder Point</label>
                  <input
                    type="number"
                    value={form.reorderPoint || ''}
                    onChange={(e) => updateField('reorderPoint', Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A] text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Berat (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.weight || ''}
                    onChange={(e) => updateField('weight', Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dimensi (PxLxT cm)</label>
                  <input
                    value={form.dimensions}
                    onChange={(e) => updateField('dimensions', e.target.value)}
                    placeholder="20x15x10"
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#2C4A5A]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Status */}
        <div className="col-span-4 space-y-4">
          <div className="bg-white border border-gray-200 rounded">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Status</h3>
            </div>
            <div className="p-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#2C4A5A] focus:ring-[#2C4A5A]"
                />
                <span className="text-sm text-gray-700">Produk Aktif</span>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Produk tidak aktif tidak akan muncul di transaksi
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}