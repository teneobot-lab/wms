'use client';

export default function StockCardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Stock Card</h1>
        <p className="text-xs text-text-muted">Detailed stock movement history</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Stock Card Report</h3>
          <p className="text-sm text-text-muted mb-4">Track in/out movements for each product</p>
        </div>
      </div>
    </div>
  );
}