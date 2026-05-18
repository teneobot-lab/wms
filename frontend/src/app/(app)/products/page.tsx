export const dynamic = 'force-dynamic';
'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DataTable } from '@/components/table/DataTable';

interface ProductRow {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  category: { name: string };
  unit: { name: string };
  costPrice: string;
  sellPrice: string;
  minStock: number;
  reorderPoint: number;
  isActive: boolean;
  totalQty: number;
}

const columns: ColumnDef<ProductRow, any>[] = [
  {
    id: 'index',
    header: '#',
    size: 50,
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: 'sku',
    header: 'SKU',
    size: 120,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs font-semibold text-primary-700">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'barcode',
    header: 'Barcode',
    size: 120,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-text-muted">{(getValue() as string) || '—'}</span>
    ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    size: 280,
    cell: ({ getValue }) => (
      <span className="font-medium text-text-primary">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'category.name',
    header: 'Category',
    size: 120,
    cell: ({ row }) => (
      <span className="badge badge-neutral">{row.original.category?.name || '—'}</span>
    ),
  },
  {
    accessorKey: 'unit.name',
    header: 'Unit',
    size: 80,
  },
  {
    accessorKey: 'costPrice',
    header: 'Cost',
    size: 100,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'sellPrice',
    header: 'Sell',
    size: 100,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'totalQty',
    header: 'Stock',
    size: 80,
    cell: ({ getValue, row }) => {
      const qty = getValue() as number;
      const reorder = row.original.reorderPoint;
      const color = qty <= 0 ? 'text-danger' : qty <= reorder ? 'text-warning' : 'text-success';
      return <span className={`font-mono font-semibold ${color}`}>{qty.toLocaleString('id-ID')}</span>;
    },
  },
  {
    accessorKey: 'minStock',
    header: 'Min',
    size: 70,
    cell: ({ getValue }) => <span className="font-mono text-xs text-text-muted">{getValue() as number}</span>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    size: 80,
    cell: ({ getValue }) => (
      <span className={`badge ${getValue() ? 'badge-success' : 'badge-danger'}`}>
        {getValue() ? 'Active' : 'Inactive'}
      </span>
    ),
  },
];

export default function ProductsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(search ? { search } : {}),
      });
      const res = await api.get(`/products?${params}`);
      return res.data;
    },
  });

  const products = data?.data || [];

  return (
    <div className="space-y-3">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Products</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} items</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/products/new')}
            className="btn btn-primary btn-default"
          >
            + New Product
          </button>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={products}
        columns={columns}
        pageSize={50}
        isLoading={isLoading || isFetching}
        onRowClick={(row) => router.push(`/products/${row.id}`)}
        emptyMessage="No products found. Create your first product."
      />
    </div>
  );
}