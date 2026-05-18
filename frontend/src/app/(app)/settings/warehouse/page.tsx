'use client';

export default function WarehouseSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Warehouses</h1>
          <p className="text-xs text-text-muted">Manage warehouse locations</p>
        </div>
        <button className="btn btn-primary btn-default">+ Add Warehouse</button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🏭</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Warehouses Found</h3>
          <p className="text-sm text-text-muted mb-4">Create your first warehouse to get started</p>
          <button className="btn btn-primary btn-default">+ Add Warehouse</button>
        </div>
      </div>
    </div>
  );
}