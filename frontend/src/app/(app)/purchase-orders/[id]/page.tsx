'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToastStore } from '@/stores/uiStore';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  RECEIVED: 'Diterima',
  CANCELLED: 'Dibatalkan',
  PARTIAL: 'Sebagian',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-yellow-100 text-yellow-700',
  REJECTED: 'bg-red-100 text-red-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-orange-100 text-orange-700',
};

type POStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIAL' | 'REJECTED' | 'RECEIVED' | 'CANCELLED';

interface ReceiveItem {
  productId: string;
  productName: string;
  productSku: string;
  qtyOrdered: number;
  qtyReceived: number;
  binId: string;
  binLabel: string;
  batchNo: string;
  expiryDate: string;
}

export default function PODetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const [activeTab, setActiveTab] = useState('items');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveItems, setReceiveItems] = useState<ReceiveItem[]>([]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders', params.id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${params.id}`);
      return res.data.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/purchase-orders/${params.id}/submit`);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'PO berhasil diajukan');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', params.id] });
      refetch();
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal mengajukan PO');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/purchase-orders/${params.id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'PO berhasil disetujui');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', params.id] });
      refetch();
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal menyetujui PO');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/purchase-orders/${params.id}/reject`);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'PO berhasil ditolak');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', params.id] });
      refetch();
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal menolak PO');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/purchase-orders/${params.id}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'PO berhasil dibatalkan');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', params.id] });
      setCancelDialogOpen(false);
      refetch();
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal membatalkan PO');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (items: ReceiveItem[]) => {
      const res = await api.post(`/purchase-orders/${params.id}/receive`, {
        items: items.map(item => ({
          productId: item.productId,
          qtyReceived: item.qtyReceived,
          binId: item.binId,
          batchNo: item.batchNo || undefined,
          expiryDate: item.expiryDate || undefined,
        })),
      });
      return res.data;
    },
    onSuccess: () => {
      addToast('success', 'Barang berhasil diterima');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', params.id] });
      setReceiveModalOpen(false);
      refetch();
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.message || 'Gagal menerima barang');
    },
  });

  const openReceiveModal = () => {
    if (data?.items) {
      const items: ReceiveItem[] = data.items.map((item: any) => ({
        productId: item.productId || item.product?.id,
        productName: String(item.productName || item.product?.name || '-'),
        productSku: String(item.productSku || item.product?.sku || ''),
        qtyOrdered: Number(item.quantity || item.qtyOrdered || 0),
        qtyReceived: Number(item.quantity || item.qtyOrdered || 0) - Number(item.receivedQty || 0),
        binId: '',
        binLabel: '',
        batchNo: '',
        expiryDate: '',
      }));
      setReceiveItems(items);
      setReceiveModalOpen(true);
    }
  };

  const updateReceiveItem = (index: number, field: keyof ReceiveItem, value: string | number) => {
    const updated = [...receiveItems];
    (updated[index] as any)[field] = value;
    setReceiveItems(updated);
  };

  const handleReceiveSubmit = () => {
    const validItems = receiveItems.filter(item => item.binId && item.qtyReceived > 0);
    if (validItems.length === 0) {
      addToast('error', 'Pilih bin dan masukkan jumlah untuk minimal 1 item');
      return;
    }
    receiveMutation.mutate(validItems);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">Memuat...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-sm text-gray-500">Data tidak ditemukan</div>;
  }

  const po = data;
  const status = po.status as POStatus;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/purchase-orders')} className="text-sm text-[#2C4A5A] hover:underline mb-1">
            ← Kembali ke Purchase Orders
          </button>
          <h1 className="text-lg font-semibold text-gray-900">PO-{po.poNo}</h1>
          <p className="text-xs text-gray-500">
            {formatDate(po.orderDate)} • {po.supplier?.name || '-'}
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
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="px-3 py-1.5 text-xs bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A] disabled:opacity-50"
            >
              {submitMutation.isPending ? '...' : 'Submit'}
            </button>
            <button
              onClick={() => setCancelDialogOpen(true)}
              disabled={cancelMutation.isPending}
              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
            >
              Batalkan
            </button>
          </>
        )}
        {status === 'SUBMITTED' && (
          <>
            <button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {approveMutation.isPending ? '...' : 'Setujui'}
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
            >
              {rejectMutation.isPending ? '...' : 'Tolak'}
            </button>
          </>
        )}
        {(status === 'APPROVED' || status === 'PARTIAL') && (
          <button
            onClick={openReceiveModal}
            className="px-3 py-1.5 text-xs bg-[#D97706] text-white rounded hover:bg-amber-700"
          >
            Terima Barang
          </button>
        )}
        {status === 'RECEIVED' && (
          <button className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50">
            Lihat Goods Receipt
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          {['items', 'goodsReceipt', 'history'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#2C4A5A] text-[#2C4A5A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'items' ? 'Detail Item' : tab === 'goodsReceipt' ? 'Goods Receipt' : 'Riwayat'}
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
                <th className="px-3 py-2 font-medium text-right">Qty Received</th>
                <th className="px-3 py-2 font-medium text-right">Harga</th>
                <th className="px-3 py-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {po.items?.map((item: Record<string, unknown>, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{String(item.productName || (item.product as Record<string, unknown>)?.name || '-')}</div>
                    <div className="text-xs text-gray-400">{String(item.productSku || (item.product as Record<string, unknown>)?.sku || '')}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.quantity || item.qtyOrdered) || 0}</td>
                  <td className="px-3 py-2 text-right font-mono">{Number(item.receivedQty) || 0}</td>
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

      {activeTab === 'goodsReceipt' && (
        <div className="bg-white border border-gray-200 rounded p-8 text-center text-sm text-gray-400">
          Belum ada Goods Receipt untuk PO ini
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
          <h4 className="font-medium text-gray-700 mb-2">Informasi Supplier</h4>
          <div className="space-y-1 text-xs text-gray-500">
            <div>{po.supplier?.name || '-'}</div>
            <div>{po.supplier?.contact || '-'}</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded p-4">
          <h4 className="font-medium text-gray-700 mb-2">Ringkasan</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Item</span>
              <span className="font-medium">{po.items?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Nilai</span>
              <span className="font-medium font-mono">
                Rp {(Number(po.totalAmount) || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
        title="Batalkan PO"
        message={`Apakah Anda yakin ingin membatalkan PO-${po.poNo}?`}
        confirmText="Batalkan"
        isLoading={cancelMutation.isPending}
        type="danger"
      />

      {/* Receive Modal */}
      {receiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setReceiveModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Terima Barang - PO-{po.poNo}</h3>
              <button onClick={() => setReceiveModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {receiveItems.length === 0 ? (
                <div className="text-center text-gray-400 py-8">Tidak ada item untuk diterima</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="px-2 py-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">Produk</th>
                      <th className="px-2 py-2 font-medium text-right">Qty Order</th>
                      <th className="px-2 py-2 font-medium text-right">Qty Terima</th>
                      <th className="px-2 py-2 font-medium">Bin Tujuan</th>
                      <th className="px-2 py-2 font-medium">Batch No</th>
                      <th className="px-2 py-2 font-medium">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receiveItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-2 py-2">
                          <div className="font-medium text-xs">{item.productName}</div>
                          <div className="text-xs text-gray-400">{item.productSku}</div>
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">{item.qtyOrdered}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            max={item.qtyOrdered}
                            value={item.qtyReceived}
                            onChange={(e) => updateReceiveItem(idx, 'qtyReceived', Number(e.target.value))}
                            className="w-20 px-2 py-1 text-sm text-right border border-gray-200 rounded font-mono"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <SearchAutocomplete
                            endpoint="/search/bins"
                            value={item.binLabel}
                            onChange={(val) => {
                              const updated = [...receiveItems];
                              updated[idx].binLabel = val;
                              setReceiveItems(updated);
                            }}
                            onSelect={(bin) => {
                              const updated = [...receiveItems];
                              updated[idx].binId = bin.id as string;
                              updated[idx].binLabel = bin.label as string;
                              setReceiveItems(updated);
                            }}
                            fuseKeys={['label', 'secondary']}
                            placeholder="Pilih bin..."
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="text"
                            value={item.batchNo}
                            onChange={(e) => updateReceiveItem(idx, 'batchNo', e.target.value)}
                            placeholder="Opsional"
                            className="w-24 px-2 py-1 text-xs border border-gray-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateReceiveItem(idx, 'expiryDate', e.target.value)}
                            className="w-28 px-2 py-1 text-xs border border-gray-200 rounded"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setReceiveModalOpen(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={handleReceiveSubmit}
                disabled={receiveMutation.isPending}
                className="px-4 py-1.5 text-sm bg-[#D97706] text-white rounded hover:bg-amber-700 disabled:opacity-50"
              >
                {receiveMutation.isPending ? 'Memproses...' : 'Terima Barang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}