'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/table/DataTable';

interface POPage {
  id: string;
  poNo: string;
  status: string;
  orderDate: string;
  expectedDate?: string;
  supplier: { name: string };
  items: any[];
  totalAmount: string;
  createdByUser: { name: string };
}

const statusColors: Record<string, string> = {
  DRAFT: 'badge-warning',
  SUBMITTED: 'badge-info',
  APPROVED: 'badge-primary',
  PARTIAL: 'badge-warning',
  RECEIVED: 'badge-success',
  CANCELLED: 'badge-danger',
};

const columns: ColumnDef<POPage, any>[] = [
  {
    id: 'index',
    header: '#',
    size: 50,
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: 'poNo',
    header: 'PO No',
    size: 160,
    cell: ({ getValue }) => (
      <span className="font-mono text-xs font-semibold text-primary-700">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'supplier.name',
    header: 'Supplier',
    size: 180,
    cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
  },
  {
    accessorKey: 'orderDate',
    header: 'Order Date',
    size: 120,
    cell: ({ getValue }) => (
      <span className="text-text-secondary">{formatDate(getValue() as string)}</span>
    ),
  },
  {
    accessorKey: 'expectedDate',
    header: 'Expected',
    size: 120,
    cell: ({ getValue }) => (
      <span className="text-text-secondary">{getValue() ? formatDate(getValue() as string) : '—'}</span>
    ),
  },
  {
    accessorKey: 'items',
    header: 'Items',
    size: 60,
    cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as any[]).length}</span>,
  },
  {
    accessorKey: 'totalAmount',
    header: 'Total',
    size: 120,
    cell: ({ getValue }) => (
      <span className="font-mono font-semibold">{formatCurrency(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    size: 110,
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return <span className={`badge ${statusColors[status] || 'badge-neutral'}`}>{status}</span>;
    },
  },
  {
    accessorKey: 'createdByUser.name',
    header: 'Created By',
    size: 120,
    cell: ({ getValue }) => <span className="text-text-secondary text-xs">{getValue() as string}</span>,
  },
];

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await api.get(`/purchase-orders?${params}`);
      return res.data;
    },
  });

  const orders = data?.data || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Purchase Orders</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIAL">Partial</option>
            <option value="RECEIVED">Received</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={() => router.push('/purchase-orders/new')}
            className="btn btn-primary btn-default"
          >
            + New PO
          </button>
        </div>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        pageSize={50}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
        emptyMessage="No purchase orders found."
      />
    </div>
  );
}