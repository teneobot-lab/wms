'use client';

export default function StockSummaryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Stock Summary</h1>
        <p className="text-xs text-text-muted">Overview of current stock levels</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">📈</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Stock Summary Report</h3>
          <p className="text-sm text-text-muted mb-4">View summary of all stock levels across warehouses</p>
        </div>
      </div>
    </div>
  );
}