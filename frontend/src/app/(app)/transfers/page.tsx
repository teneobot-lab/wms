'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/table/DataTable';

interface Transfer {
  id: string;
  transferNo: string;
  sourceBin: { code: string; name: string };
  destinationBin: { code: string; name: string };
  status: string;
  createdAt: string;
  createdByUser: { name: string };
  items: any[];
}

const statusColors: Record<string, string> = {
  DRAFT: 'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

const columns: ColumnDef<Transfer, any>[] = [
  { id: 'index', header: '#', size: 50, cell: ({ row }) => row.index + 1 },
  { accessorKey: 'transferNo', header: 'Transfer No', size: 160, cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-primary-700">{getValue() as string}</span> },
  { accessorKey: 'sourceBin.code', header: 'From Bin', size: 100 },
  { accessorKey: 'destinationBin.code', header: 'To Bin', size: 100 },
  { accessorKey: 'createdAt', header: 'Date', size: 120, cell: ({ getValue }) => <span className="text-text-secondary">{formatDate(getValue() as string)}</span> },
  { accessorKey: 'items', header: 'Items', size: 60, cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as any[]).length}</span> },
  { accessorKey: 'status', header: 'Status', size: 110, cell: ({ getValue }) => { const s = getValue() as string; return <span className={`badge ${statusColors[s] || 'badge-neutral'}`}>{s}</span>; } },
  { accessorKey: 'createdByUser.name', header: 'Created By', size: 120, cell: ({ getValue }) => <span className="text-text-secondary text-xs">{getValue() as string}</span> },
];

export default function TransfersPage() {
  const router = useRouter();
  const [page] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['transfers', page],
    queryFn: async () => {
      const res = await api.get(`/transfers?page=${page}&limit=50`);
      return res.data;
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Stock Transfers</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} transfers</p>
        </div>
        <button onClick={() => router.push('/transfers/new')} className="btn btn-primary btn-default">+ New Transfer</button>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pageSize={50}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/transfers/${row.id}`)}
        emptyMessage="No transfers found."
      />
    </div>
  );
}