'use client';

export default function MovementLedgerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Movement Ledger</h1>
        <p className="text-xs text-text-muted">Complete movement transaction log</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">📉</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Movement Ledger</h3>
          <p className="text-sm text-text-muted mb-4">Complete log of all stock movements</p>
        </div>
      </div>
    </div>
  );
}