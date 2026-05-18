'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/table/DataTable';

export default function TransfersPage() {
  const [page] = useState(1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Stock Transfers</h1>
        </div>
        <button className="btn btn-primary btn-default">+ New Transfer</button>
      </div>

      <div className="card">
        <div className="card-body py-8 text-center text-text-muted text-sm">
          Transfer functionality — create bin-to-bin stock transfers
        </div>
      </div>
    </div>
  );
}