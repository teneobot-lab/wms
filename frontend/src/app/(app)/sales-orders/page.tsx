'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/table/DataTable';

interface SalesOrder {
  id: string;
  soNo: string;
  status: string;
  orderDate: string;
  customer: { name: string };
  items: any[];
  totalAmount: string;
  createdByUser: { name: string };
}

const statusColors: Record<string, string> = {
  DRAFT: 'badge-warning',
  CONFIRMED: 'badge-info',
  PICKING: 'badge-primary',
  PACKED: 'badge-primary',
  SHIPPED: 'badge-success',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
};

const columns: ColumnDef<SalesOrder, any>[] = [
  { id: 'index', header: '#', size: 50, cell: ({ row }) => row.index + 1 },
  { accessorKey: 'soNo', header: 'SO No', size: 160, cell: ({ getValue }) => <span className="font-mono text-xs font-semibold text-primary-700">{getValue() as string}</span> },
  { accessorKey: 'customer.name', header: 'Customer', size: 180, cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span> },
  { accessorKey: 'orderDate', header: 'Order Date', size: 120, cell: ({ getValue }) => <span className="text-text-secondary">{formatDate(getValue() as string)}</span> },
  { accessorKey: 'items', header: 'Items', size: 60, cell: ({ getValue }) => <span className="font-mono text-xs">{(getValue() as any[]).length}</span> },
  { accessorKey: 'totalAmount', header: 'Total', size: 120, cell: ({ getValue }) => <span className="font-mono font-semibold">{formatCurrency(Number(getValue()))}</span> },
  { accessorKey: 'status', header: 'Status', size: 110, cell: ({ getValue }) => { const s = getValue() as string; return <span className={`badge ${statusColors[s] || 'badge-neutral'}`}>{s}</span>; } },
  { accessorKey: 'createdByUser.name', header: 'Created By', size: 120, cell: ({ getValue }) => <span className="text-text-secondary text-xs">{getValue() as string}</span> },
];

export default function SalesOrdersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sales-orders', page],
    queryFn: async () => {
      const res = await api.get(`/sales-orders?page=${page}&limit=50`);
      return res.data;
    },
  });

  const orders = data?.data || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Sales Orders</h1>
          <p className="text-xs text-text-muted">{data?.pagination?.total || 0} orders</p>
        </div>
        <button onClick={() => router.push('/sales-orders/new')} className="btn btn-primary btn-default">+ New SO</button>
      </div>

      <DataTable
        data={orders}
        columns={columns}
        pageSize={50}
        isLoading={isLoading}
        onRowClick={(row) => router.push(`/sales-orders/${row.id}`)}
        emptyMessage="No sales orders found."
      />
    </div>
  );
}