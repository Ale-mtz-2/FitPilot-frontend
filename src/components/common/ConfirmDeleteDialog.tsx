import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDeleteDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  itemName?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

/**
 * Reusable confirmation dialog for delete operations
 * Replaces duplicated confirmation patterns across ExercisesPage, ClientsPage, etc.
 */
export function ConfirmDeleteDialog({
  isOpen,
  title = 'Confirmar eliminación',
  message,
  itemName,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  isLoading = false,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmDeleteDialogProps) {
  const variantStyles = {
    danger: {
      icon: 'bg-red-100 text-red-600',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: 'bg-yellow-100 text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={onCancel}
          />

          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md rounded-[2.5rem] border border-gray-100 bg-white shadow-2xl"
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.72, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.72, rotate: 90 }}
                transition={{
                  duration: 0.28,
                  delay: 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={onCancel}
                className="absolute right-5 top-5 rounded-2xl p-2.5 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
                disabled={isLoading}
              >
                <X className="h-5 w-5" />
              </motion.button>

              <div className="p-8">
                <div className="mb-4 flex justify-center">
                  <div className={`rounded-full p-3 ${styles.icon}`}>
                    <ExclamationTriangleIcon className="h-8 w-8" />
                  </div>
                </div>

                <h3 className="mb-2 text-center text-xl font-semibold text-gray-900">
                  {title}
                </h3>

                <p className="mb-2 text-center text-gray-600">
                  {message}
                </p>

                {itemName && (
                  <p className="mb-6 text-center">
                    <span className="rounded-lg bg-gray-100 px-3 py-1 font-medium text-gray-900">
                      {itemName}
                    </span>
                  </p>
                )}

                <p className="mb-6 text-center text-sm text-gray-500">
                  Esta acción no se puede deshacer.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    {cancelLabel}
                  </Button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-white font-medium
                             transition-all duration-200 disabled:opacity-50
                             focus:outline-none focus:ring-2 focus:ring-offset-2
                             ${styles.button}`}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Eliminando...
                      </span>
                    ) : (
                      confirmLabel
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook for managing confirm delete dialog state
 */
export function useConfirmDelete<T extends { id: string; name?: string }>() {
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteDialog = (item: T) => {
    setItemToDelete(item);
  };

  const closeDeleteDialog = () => {
    setItemToDelete(null);
  };

  const confirmDelete = async (onDelete: (item: T) => Promise<void>) => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(itemToDelete);
      setItemToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    itemToDelete,
    isDeleting,
    isOpen: !!itemToDelete,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  };
}

export default ConfirmDeleteDialog;
