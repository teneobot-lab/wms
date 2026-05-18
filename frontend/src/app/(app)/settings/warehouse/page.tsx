'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { CrudModal } from '@/components/modals/CrudModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseFormData {
  code: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

const initialFormData: WarehouseFormData = {
  code: '',
  name: '',
  address: '',
  phone: '',
  isActive: true,
};

export default function WarehouseSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>(initialFormData);

  const { data: warehouses, isLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get('/warehouses');
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: WarehouseFormData) => {
      const response = await api.post('/warehouses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      addToast('success', 'Gudang berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WarehouseFormData }) => {
      const response = await api.put(`/warehouses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      addToast('success', 'Gudang berhasil diperbarui');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/warehouses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      addToast('success', 'Gudang berhasil dihapus');
      closeDeleteDialog();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const openAddModal = () => {
    setSelectedWarehouse(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      phone: warehouse.phone || '',
      isActive: warehouse.isActive,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setIsDeleteDialogOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWarehouse(null);
    setFormData(initialFormData);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedWarehouse(null);
  };

  const handleSubmit = () => {
    if (selectedWarehouse) {
      updateMutation.mutate({ id: selectedWarehouse.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedWarehouse) {
      deleteMutation.mutate(selectedWarehouse.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Gudang</h1>
          <p className="text-xs text-text-muted">Kelola lokasi gudang</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Gudang</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-sm text-text-muted">Memuat data...</p>
          </div>
        ) : warehouses && warehouses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Alamat</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telepon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{warehouse.code}</td>
                    <td className="px-4 py-3">{warehouse.name}</td>
                    <td className="px-4 py-3 text-gray-500">{warehouse.address || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{warehouse.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${warehouse.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {warehouse.isActive ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(warehouse)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                      <button onClick={() => openDeleteDialog(warehouse)} className="text-red-600 hover:text-red-800">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4">🏭</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Belum Ada Gudang</h3>
            <p className="text-sm text-text-muted mb-4">Buat gudang pertama Anda</p>
            <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Gudang</button>
          </div>
        )}
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedWarehouse ? 'Edit Gudang' : 'Tambah Gudang'}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: WH001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: Gudang Utama"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: Jl. Raya Gudang No. 1"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: 021-12345678"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-[#2C4A5A] border-gray-300 rounded focus:ring-[#2C4A5A]"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
          </div>
        </div>
      </CrudModal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Hapus Gudang"
        message={`Apakah Anda yakin ingin menghapus gudang "${selectedWarehouse?.name}"?`}
        confirmText="Hapus"
        isLoading={deleteMutation.isPending}
        type="danger"
      />
    </div>
  );
}