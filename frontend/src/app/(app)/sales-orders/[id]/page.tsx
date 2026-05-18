'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToastStore } from '@/stores/uiStore';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Dikonfirmasi',
  PICKING: 'Sedang Dipick',
  PACKED: 'Sudah Dipack',
  SHIPPED: 'Sudah Dikirim',
  DELIVERED: 'Terkirim',
  CANCELLED: 'Dibatalkan',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PICKING: 'bg-yellow-100 text-yellow-700',
  PACKED: 'bg-indigo-100 text-indigo-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

type SOStatus = 'DRAFT' | 'CONFIRMED' | 'PICKING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export default function SODetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('items');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sales-orders', params.id],
    queryFn: async () => {
      const res = await api.get(`/sales-orders/${params.id}`);
      return res.data.data;
    },
  });

  const handleAction = async (action: string) => {
    try {
      await api.post(`/sales-orders/${params.id}/${action.toLowerCase()}`);
      addToast('success', `SO berhasil di-${action}`);
      refetch();
    } catch {
      addToast('error', `Gagal ${action}`);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-sm text-gray-500">Data tidak ditemukan</div>;
  }

  const so = data;
  const status = so.status as SOStatus;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/sales-orders')} className="text-sm text-[#2C4A5A] hover:underline mb-1">
            ← Kembali ke Sales Orders
          </button>
          <h1 className="text-lg font-semibold text-gray-900">SO-{so.soNo}</h1>
          <p className="text-xs text-gray-500">
            {formatDate(so.orderDate)} • {so.customer?.name || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>
      </div>

      {/* Status Actions */}
      <div className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded">
        {status === 'DRAFT' && (
          <>
            <button
              onClick={() => handleAction('confirm')}
              className="px-3 py-1.5 text-xs bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A]"
            >
              Konfirmasi
            </button>
            <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
              Edit
            </button>
            <button className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">
              Batalkan
            </button>
          </>
        )}
        {status === 'CONFIRMED' && (
          <button className="px-3 py-1.5 text-xs bg-[#D97706] text-white rounded hover:bg-amber-700">
            Buat Picking Order
          </button>
        )}
        {status === 'PICKING' && (
          <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
            Lihat Picking Order
          </button>
        )}
        {status === 'PACKED' && (
          <button className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700">
            Tandai Terkirim
          </button>
        )}
        {status === 'DELIVERED' && (
          <span className="text-xs text-green-600">✓ Order telah terkirim</span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {['items', 'picking', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#2C4A5A] text-[#2C4A5A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'items' ? 'Detail Item' : tab === 'picking' ? 'Picking Orders' : 'Riwayat'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'items' && (
        <div className="bg-white border border-gray-200 rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Produk</th>
                <th className="px-3 py-2 font-medium text-right">Qty Order</th>
                <th className="px-3 py-2 font-medium text-right">Qty Picked</th>
                <th className="px-3 py-2 font-medium text-right">Harga</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {so.items?.map((item: Record<string, unknown>, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{String(item.productName || (item.product as Record<string, unknown>)?.name || '-')}</div>
                    <div className="text-xs text-gray-400">{String(item.productSku || (item.product as Record<string, unknown>)?.sku || '')}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.quantity) || 0}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.pickedQty) || 0}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    Rp {(Number(item.unitPrice) || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-medium">
                    Rp {(Number(item.total) || 0).toLocaleString('id-ID')}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                    Tidak ada item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'picking' && (
        <div className="bg-white border border-gray-200 rounded p-8 text-center text-sm text-gray-400">
          Belum ada picking order untuk SO ini
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white border border-gray-200 rounded p-8 text-center text-sm text-gray-400">
          Belum ada riwayat perubahan status
        </div>
      )}

      {/* Footer Info */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-white border border-gray-200 rounded p-4">
          <h4 className="font-medium text-gray-700 mb-2">Informasi Customer</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div>{so.customer?.name || '-'}</div>
            <div>{so.customer?.contact || '-'}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <h4 className="font-medium text-gray-700 mb-2">Ringkasan</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Item</span>
              <span className="font-medium">{so.items?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Nilai</span>
              <span className="font-medium font-mono">
                Rp {(Number(so.totalAmount) || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}