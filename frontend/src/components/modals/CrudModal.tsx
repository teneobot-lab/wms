'use client';

import { ReactNode, useEffect } from 'react';

interface CrudModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  isLoading?: boolean;
  submitText?: string;
  showSubmit?: boolean;
}

export function CrudModal({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  isLoading = false,
  submitText = 'Simpan',
  showSubmit = true,
}: CrudModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="p-4">
          {children}
        </div>
        {showSubmit && onSubmit && (
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button onClick={onClose} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">Batal</button>
            <button onClick={onSubmit} disabled={isLoading} className="px-4 py-1.5 text-sm bg-[#2C4A5A] text-white rounded hover:bg-[#1A2F3A] disabled:opacity-50">
              {isLoading ? 'Menyimpan...' : submitText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}