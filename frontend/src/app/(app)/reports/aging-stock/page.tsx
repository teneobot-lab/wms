'use client';

export default function AgingStockPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Aging Stock</h1>
        <p className="text-xs text-text-muted">Identify slow-moving inventory</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Aging Stock Analysis</h3>
          <p className="text-sm text-text-muted mb-4">Identify stock that hasn't moved in a while</p>
        </div>
      </div>
    </div>
  );
}