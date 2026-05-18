'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { CrudModal } from '@/components/modals/CrudModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';

interface Customer {
  id: string;
  code: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerFormData {
  code: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  isActive: boolean;
}

const initialFormData: CustomerFormData = {
  code: '',
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  isActive: true,
};

export default function CustomersSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const response = await api.get('/customers');
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await api.post('/customers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addToast('success', 'Customer berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const response = await api.put(`/customers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addToast('success', 'Customer berhasil diperbarui');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  // Soft delete - set isActive to false
  const softDeleteMutation = useMutation({
    mutationFn: async (customer: Customer) => {
      const response = await api.put(`/customers/${customer.id}`, { ...customer, isActive: false });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      addToast('success', 'Customer berhasil dinonaktifkan');
      closeDeleteDialog();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const openAddModal = () => {
    setSelectedCustomer(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      contact: customer.contact || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      isActive: customer.isActive,
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
    setFormData(initialFormData);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCustomer(null);
  };

  const handleSubmit = () => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedCustomer) {
      softDeleteMutation.mutate(selectedCustomer);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Customer</h1>
          <p className="text-xs text-text-muted">Kelola informasi customer</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Customer</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-sm text-text-muted">Memuat data...</p>
          </div>
        ) : customers && customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kontak</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Telepon</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{customer.code}</td>
                    <td className="px-4 py-3">{customer.name}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.contact || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{customer.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {customer.isActive ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(customer)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                      <button onClick={() => openDeleteDialog(customer)} className="text-red-600 hover:text-red-800">Nonaktifkan</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4">👤</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Belum Ada Customer</h3>
            <p className="text-sm text-text-muted mb-4">Tambah customer pertama Anda</p>
            <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Customer</button>
          </div>
        )}
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedCustomer ? 'Edit Customer' : 'Tambah Customer'}
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
              placeholder="Contoh: CUST001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: PT Customer Indonesia"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kontak</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Nama kontak"
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: customer@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: Jl. Customer Raya No. 1"
              rows={2}
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
        title="Nonaktifkan Customer"
        message={`Apakah Anda yakin ingin menonaktifkan customer "${selectedCustomer?.name}"?`}
        confirmText="Nonaktifkan"
        isLoading={softDeleteMutation.isPending}
        type="warning"
      />
    </div>
  );
}