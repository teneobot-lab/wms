'use client';

export default function ABCAnalysisPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">ABC Analysis</h1>
        <p className="text-xs text-text-muted">Classify products by importance</p>
      </div>

      <div className="card">
        <div className="card-body text-center py-12">
          <div className="text-4xl mb-4">🏆</div>
          <h3 className="text-lg font-medium text-text-primary mb-2">ABC Analysis Report</h3>
          <p className="text-sm text-text-muted mb-4">Classify products by sales velocity and value</p>
        </div>
      </div>
    </div>
  );
}