'use client';

export default function ReorderListPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Reorder List</h1>
        <p className="text-xs text-text-muted">Products that need to be reordered</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🔁</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Reorder Recommendations</h3>
          <p className="text-sm text-text-muted mb-4">Products below minimum stock level</p>
        </div>
      </div>
    </div>
  );
}