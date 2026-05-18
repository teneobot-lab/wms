'use client';

export const dynamic = 'force-dynamic';


import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/table/DataTable';

interface StockMovement {
  id: string;
  refNo: string;
  createdAt: string;
  product: { sku: string; name: string };
  type: string;
  qty: string;
  qtyBefore: string;
  qtyAfter: string;
  fromBinId?: string;
  toBinId?: string;
  createdBy: string;
}

const typeColors: Record<string, string> = {
  RECEIPT: 'badge-success',
  ISSUE: 'badge-danger',
  TRANSFER: 'badge-primary',
  ADJUSTMENT_IN: 'badge-info',
  ADJUSTMENT_OUT: 'badge-warning',
  RETURN_IN: 'badge-info',
  RETURN_OUT: 'badge-warning',
};

const columns: ColumnDef<StockMovement, any>[] = [
  { id: 'index', header: '#', size: 50, cell: ({ row }) => row.index + 1 },
  { accessorKey: 'refNo', header: 'Ref No', size: 160, cell: ({ getValue }) => <span className="font-mono text-xs font-semibold">{getValue() as string}</span> },
  { accessorKey: 'createdAt', header: 'Date', size: 140, cell: ({ getValue }) => <span className="text-text-secondary">{formatDate(getValue() as string)}</span> },
  { accessorKey: 'product.name', header: 'Product', size: 200, cell: ({ row }) => (
    <div>
      <div className="font-medium text-text-primary">{row.original.product?.name || '—'}</div>
      <div className="font-mono text-xs text-text-muted">{row.original.product?.sku}</div>
    </div>
  )},
  { accessorKey: 'type', header: 'Type', size: 130, cell: ({ getValue }) => {
    const t = getValue() as string;
    return <span className={`badge ${typeColors[t] || 'badge-neutral'}`}>{t}</span>;
  }},
  { accessorKey: 'qty', header: 'Qty', size: 90, cell: ({ getValue, row }) => {
    const type = row.original.type;
    const color = type.includes('IN') || type === 'RECEIPT' || type === 'RETURN_IN' ? 'text-success' : 'text-danger';
    return <span className={`font-mono font-semibold ${color}`}>
      {type.includes('IN') || type === 'RECEIPT' || type === 'RETURN_IN' ? '+' : type.includes('OUT') || type === 'ISSUE' || type === 'RETURN_OUT' ? '-' : ''}{Number(getValue()).toLocaleString('id-ID')}
    </span>;
  }},
  { accessorKey: 'qtyBefore', header: 'Before', size: 80, cell: ({ getValue }) => <span className="font-mono text-xs">{Number(getValue()).toLocaleString('id-ID')}</span> },
  { accessorKey: 'qtyAfter', header: 'After', size: 80, cell: ({ getValue }) => <span className="font-mono text-xs">{Number(getValue()).toLocaleString('id-ID')}</span> },
];

export default function StockMovementsPage() {
  const [page] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stock-movements', page, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50', ...(typeFilter ? { type: typeFilter } : {}) });
      const res = await api.get(`/stock-movements?${params}`);
      return res.data;
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Stock Movements</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} records</p>
        </div>
        <select className="select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="RECEIPT">Receipt</option>
          <option value="ISSUE">Issue</option>
          <option value="TRANSFER">Transfer</option>
          <option value="ADJUSTMENT_IN">Adjustment In</option>
          <option value="ADJUSTMENT_OUT">Adjustment Out</option>
          <option value="RETURN_IN">Return In</option>
          <option value="RETURN_OUT">Return Out</option>
        </select>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pageSize={50}
        isLoading={isLoading}
        emptyMessage="No movements recorded."
      />
    </div>
  );
}