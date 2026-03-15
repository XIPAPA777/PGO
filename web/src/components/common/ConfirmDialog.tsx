'use client'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default'
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-xs w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Content */}
        <div className="px-5 pt-5 pb-4">
          <p className="text-gray-700 text-center">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-colors",
              variant === 'danger' ? "bg-red-500 hover:bg-red-600" :
              variant === 'warning' ? "bg-amber-500 hover:bg-amber-600" :
              "bg-indigo-500 hover:bg-indigo-600"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
