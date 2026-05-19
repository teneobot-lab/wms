'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/uiStore';
import { CrudModal } from '@/components/modals/CrudModal';
import { ConfirmDialog } from '@/components/modals/ConfirmDialog';
import { SearchAutocomplete } from '@/components/form/SearchAutocomplete';

interface Category {
  id: string;
  code: string;
  name: string;
  parentCategoryId?: string;
  parentCategory?: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  code: string;
  name: string;
  parentCategoryId: string;
}

const initialFormData: CategoryFormData = {
  code: '',
  name: '',
  parentCategoryId: '',
};

export default function CategoriesSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await api.post('/categories', {
        ...data,
        parentCategoryId: data.parentCategoryId || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast('success', 'Kategori berhasil ditambahkan');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const response = await api.put(`/categories/${id}`, {
        ...data,
        parentCategoryId: data.parentCategoryId || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast('success', 'Kategori berhasil diperbarui');
      closeModal();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast('success', 'Kategori berhasil dihapus');
      closeDeleteDialog();
    },
    onError: (error) => {
      addToast('error', getErrorMessage(error));
    },
  });

  const openAddModal = () => {
    setSelectedCategory(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      parentCategoryId: category.parentCategoryId || '',
    });
    setIsModalOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setFormData(initialFormData);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const handleSubmit = () => {
    if (selectedCategory) {
      updateMutation.mutate({ id: selectedCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (selectedCategory) {
      deleteMutation.mutate(selectedCategory.id);
    }
  };

  const handleParentSelect = (item: { id: string; label: string }) => {
    setFormData({ ...formData, parentCategoryId: item.id });
  };

  const clearParentSelection = () => {
    setFormData({ ...formData, parentCategoryId: '' });
  };

  // Build category options for SearchAutocomplete (exclude current category and its children for edit mode)
  const getCategoryOptions = () => {
    if (!categories) return [];
    return categories
      .filter((c) => !selectedCategory || (c.id !== selectedCategory.id))
      .map((c) => ({
        id: c.id,
        label: c.name,
        secondary: c.code,
      }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Kategori</h1>
          <p className="text-xs text-text-muted">Kelola kategori produk</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Kategori</button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-sm text-text-muted">Memuat data...</p>
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kode</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Kategori Induk</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{category.code}</td>
                    <td className="px-4 py-3">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500">{category.parentCategory?.name || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEditModal(category)} className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                      <button onClick={() => openDeleteDialog(category)} className="text-red-600 hover:text-red-800">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4">📁</div>
            <h3 className="text-lg font-medium text-text-primary mb-2">Belum Ada Kategori</h3>
            <p className="text-sm text-text-muted mb-4">Tambah kategori pertama Anda</p>
            <button onClick={openAddModal} className="btn btn-primary btn-default">+ Tambah Kategori</button>
          </div>
        )}
      </div>

      <CrudModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedCategory ? 'Edit Kategori' : 'Tambah Kategori'}
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
              placeholder="Contoh: CAT001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2C4A5A]/50"
              placeholder="Contoh: Elektronik"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Induk (Opsional)</label>
            {formData.parentCategoryId ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm">
                  {categories?.find((c) => c.id === formData.parentCategoryId)?.name || formData.parentCategoryId}
                </div>
                <button
                  type="button"
                  onClick={clearParentSelection}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <SearchAutocomplete
                endpoint="/search/categories"
                placeholder="Cari kategori induk..."
                value=""
                onSelect={handleParentSelect}
                fuseKeys={['label', 'secondary']}
                minChars={1}
              />
            )}
            <p className="text-xs text-gray-500 mt-1">Kosongkan jika ini adalah kategori utama</p>
          </div>
        </div>
      </CrudModal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleDelete}
        title="Hapus Kategori"
        message={`Apakah Anda yakin ingin menghapus kategori "${selectedCategory?.name}"?`}
        confirmText="Hapus"
        isLoading={deleteMutation.isPending}
        type="danger"
      />
    </div>
  );
}