'use client';

export default function UnitsSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Units</h1>
          <p className="text-xs text-text-muted">Manage unit of measurement</p>
        </div>
        <button className="btn btn-primary btn-default">+ Add Unit</button>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">📐</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No Units Found</h3>
          <p className="text-sm text-text-muted mb-4">Add your first unit of measurement</p>
          <button className="btn btn-primary btn-default">+ Add Unit</button>
        </div>
      </div>
    </div>
  );
}