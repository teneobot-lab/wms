export const dynamic = 'force-dynamic';
'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: async () => {
      const res = await api.get(`/products/${params.id}`);
      return res.data.data;
    },
  });

  const { data: stockData } = useQuery({
    queryKey: ['product-stock', params.id],
    queryFn: async () => {
      const res = await api.get(`/products/${params.id}/stock`);
      return res.data.data;
    },
    enabled: !!params.id,
  });

  const { data: movements } = useQuery({
    queryKey: ['product-movements', params.id],
    queryFn: async () => {
      const res = await api.get(`/products/${params.id}/movements`);
      return res.data.data;
    },
    enabled: !!params.id,
  });

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  if (!product) return <div className="p-8 text-center text-text-muted">Product not found.</div>;

  const totalStock = stockData?.summary?.totalQty || 0;
  const totalValue = totalStock * Number(product.costPrice);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn btn-secondary btn-icon btn-sm">←</button>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{product.name}</h1>
            <p className="text-xs font-mono text-text-muted">{product.sku}</p>
          </div>
          <span className={`badge ${product.isActive ? 'badge-success' : 'badge-danger'}`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <button onClick={() => router.push(`/products/${params.id}/edit`)} className="btn btn-secondary btn-default">
          Edit Product
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="card-body py-3 px-4">
            <div className="label text-text-muted">Total Stock</div>
            <div className="text-2xl font-bold font-mono text-primary-900 mt-1">{totalStock.toLocaleString('id-ID')}</div>
            <div className="text-xs text-text-muted">{product.unit?.name}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-3 px-4">
            <div className="label text-text-muted">Stock Value</div>
            <div className="text-lg font-bold font-mono text-primary-900 mt-1">{formatCurrency(totalValue)}</div>
            <div className="text-xs text-text-muted">at cost price</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-3 px-4">
            <div className="label text-text-muted">Available</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${(stockData?.summary?.available || 0) <= product.reorderPoint ? 'text-warning' : 'text-success'}`}>
              {(stockData?.summary?.available || 0).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-text-muted">after reservations</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-3 px-4">
            <div className="label text-text-muted">Reorder Point</div>
            <div className="text-2xl font-bold font-mono mt-1">{product.reorderPoint?.toLocaleString('id-ID')}</div>
            <div className="text-xs text-text-muted">{totalStock <= product.reorderPoint ? '⚠️ Low stock!' : '✓ OK'}</div>
          </div>
        </div>
      </div>

      {/* Stock by location */}
      <div className="card">
        <div className="card-header">
          <span className="text-xs font-semibold">Stock by Location</span>
        </div>
        <div className="card-body p-0">
          {stockData?.stocks?.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-table-header border-b border-border">
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Warehouse</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Zone</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Rack</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Bin</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">Qty</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">Reserved</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">Available</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Batch / Expiry</th>
                </tr>
              </thead>
              <tbody>
                {stockData.stocks.map((s: any, i: number) => (
                  <tr key={s.id} className={`border-b border-border ${i % 2 === 1 ? 'bg-table-row-alt' : ''}`}>
                    <td className="px-4 py-2">{s.warehouseName}</td>
                    <td className="px-4 py-2">{s.zoneName}</td>
                    <td className="px-4 py-2 font-mono">{s.rackCode}</td>
                    <td className="px-4 py-2 font-mono font-semibold">{s.binCode}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{s.qty.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono text-warning">{s.reservedQty.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono">{s.available.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2">
                      {s.batchNo ? <span className="font-mono">{s.batchNo}</span> : '—'}
                      {s.expiryDate && <span className="text-text-muted ml-1">/ {formatDate(s.expiryDate)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-text-muted text-sm">No stock records</div>
          )}
        </div>
      </div>

      {/* Movement history */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <span className="text-xs font-semibold">Movement History</span>
          <a href={`/reports/stock-card?productId=${params.id}`} className="text-xs text-primary-500 hover:underline">Full Card →</a>
        </div>
        <div className="card-body p-0">
          {movements?.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-table-header border-b border-border">
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Date</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Ref</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Type</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">Qty</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">Before</th>
                  <th className="px-4 py-2 text-right text-text-muted font-semibold">After</th>
                  <th className="px-4 py-2 text-left text-text-muted font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.slice(0, 20).map((m: any) => (
                  <tr key={m.id} className="border-b border-border">
                    <td className="px-4 py-2 text-text-muted">{formatDate(m.createdAt)}</td>
                    <td className="px-4 py-2 font-mono font-semibold">{m.refNo}</td>
                    <td className="px-4 py-2">
                      <span className={`badge badge-${m.type === 'RECEIPT' ? 'success' : m.type === 'ISSUE' ? 'danger' : m.type === 'ADJUSTMENT_IN' ? 'info' : m.type === 'TRANSFER' ? 'primary' : 'neutral'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right font-mono font-semibold ${m.type.includes('IN') || m.type === 'RECEIPT' ? 'text-success' : 'text-danger'}`}>
                      {m.type.includes('IN') || m.type === 'RECEIPT' ? '+' : m.type.includes('OUT') || m.type === 'ISSUE' ? '-' : ''}{Number(m.qty).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{Number(m.qtyBefore).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-right font-mono">{Number(m.qtyAfter).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-2 text-text-muted">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-center text-text-muted text-sm">No movements recorded</div>
          )}
        </div>
      </div>

      {/* Product info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header"><span className="text-xs font-semibold">Product Details</span></div>
          <div className="card-body space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-text-muted">SKU</span><span className="font-mono font-semibold">{product.sku}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Barcode</span><span className="font-mono">{product.barcode || '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Category</span><span>{product.category?.name}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Unit</span><span>{product.unit?.name}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Weight</span><span className="font-mono">{product.weight || '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Dimensions</span><span className="font-mono">{product.dimensions || '—'}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="text-xs font-semibold">Pricing & Stock Levels</span></div>
          <div className="card-body space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-text-muted">Cost Price</span><span className="font-mono font-semibold">{formatCurrency(Number(product.costPrice))}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Sell Price</span><span className="font-mono font-semibold">{formatCurrency(Number(product.sellPrice))}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Margin</span><span className="text-success font-semibold">
              {Number(product.costPrice) > 0 ? `${((Number(product.sellPrice) - Number(product.costPrice)) / Number(product.costPrice) * 100).toFixed(1)}%` : '—'}
            </span></div>
            <div className="flex justify-between"><span className="text-text-muted">Min Stock</span><span className="font-mono">{product.minStock}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Max Stock</span><span className="font-mono">{product.maxStock}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Reorder Point</span><span className="font-mono">{product.reorderPoint}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}