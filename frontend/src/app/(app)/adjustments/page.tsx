export const dynamic = 'force-dynamic';
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/table/DataTable';

interface Adjustment {
  id: string;
  adjNo: string;
  reason: string;
  status: string;
  createdAt: string;
  createdByUser: { name: string };
  items: any[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'badge-warning',
  SUBMITTED: 'badge-info',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
};

const columns: ColumnDef<Adjustment, any>[] = [
  { id: 'index', header: '#', size: 50, cell: ({ row }) => row.index + 1 },
  { accessorKey: 'adjNo', header: 'Adj No', size: 160, cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-primary-700">{getValue() as string}</span> },
  { accessorKey: 'reason', header: 'Reason', size: 200, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { accessorKey: 'createdAt', header: 'Date', size: 120, cell: ({ getValue }) => <span className="text-text-secondary">{formatDate(getValue() as string)}</span> },
  { accessorKey: 'items', header: 'Items', size: 60, cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as any[]).length}</span> },
  { accessorKey: 'status', header: 'Status', size: 110, cell: ({ getValue }) => { const s = getValue() as string; return <span className={`badge ${statusColors[s] || 'badge-neutral'}`}>{s}</span>; } },
  { accessorKey: 'createdByUser.name', header: 'Created By', size: 120, cell: ({ getValue }) => <span className="text-text-secondary text-xs">{getValue() as string}</span> },
];

export default function AdjustmentsPage() {
  const [page] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['adjustments', page],
    queryFn: async () => {
      const res = await api.get(`/adjustments?page=${page}&limit=50`);
      return res.data;
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Stock Adjustments</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} adjustments</p>
        </div>
        <button className="btn btn-primary btn-default">+ New Adjustment</button>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pageSize={50}
        isLoading={isLoading}
        emptyMessage="No adjustments found."
      />
    </div>
  );
}