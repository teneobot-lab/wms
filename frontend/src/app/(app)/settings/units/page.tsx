'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { CrudModal } from '@/components/modals/CrudModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface Unit {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface UnitFormData {
  code: string;
  name: string;
}

const initialFormData: UnitFormData = {
  code: '',
  name: '',
};

export default function UnitsSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState<UnitFormData>(initialFormData);

  const { data: units, isLoading } = useQuery<Unit[]>({
    queryKey: ['units'],
    queryFn: async () => {
      const response = await api.get('/units');
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const response = await api.post('/units', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      addToast('success', 'Satuan berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      const response = await api.put(`/units/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      addToast('success', 'Satuan berhasil diperbarui');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/units/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      addToast('success', 'Satuan berhasil dihapus');
      closeDeleteDialog();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const openAddModal = () => {
    setSelectedUnit(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDeleteDialogOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUnit(null);
    setFormData(initialFormData);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUnit(null);
  };

  const handleSubmit = () => {
    if (selectedUnit) {
      updateMutation.mutate({ id: selectedUnit.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedUnit) {
      deleteMutation.mutate(selectedUnit.id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Satuan</h1>
          <p className="text-xs text-text-muted">Kelola satuan ukuran</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Satuan</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-sm text-text-muted">Memuat data...</p>
          </div>
        ) : units && units.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{unit.code}</td>
                    <td className="px-4 py-3">{unit.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(unit)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                      <button onClick={() => openDeleteDialog(unit)} className="text-red-600 hover:text-red-800">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4">📐</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Belum Ada Satuan</h3>
            <p className="text-sm text-text-muted mb-4">Tambah satuan pertama Anda</p>
            <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Satuan</button>
          </div>
        )}
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedUnit ? 'Edit Satuan' : 'Tambah Satuan'}
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
              placeholder="Contoh: PCS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: Pieces"
            />
          </div>
        </div>
      </CrudModal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Hapus Satuan"
        message={`Apakah Anda yakin ingin menghapus satuan "${selectedUnit?.name}"?`}
        confirmText="Hapus"
        isLoading={deleteMutation.isPending}
        type="danger"
      />
    </div>
  );
}