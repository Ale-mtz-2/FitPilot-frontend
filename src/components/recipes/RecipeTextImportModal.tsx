import { LoaderCircle, Sparkles } from 'lucide-react';
import { Modal } from '@/components/common/Modal';

interface RecipeTextImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    value: string;
    onChange: (value: string) => void;
    onConfirm: () => void;
    isDetecting?: boolean;
    isCatalogLoading?: boolean;
}

export function RecipeTextImportModal({
    isOpen,
    onClose,
    value,
    onChange,
    onConfirm,
    isDetecting = false,
    isCatalogLoading = false,
}: RecipeTextImportModalProps) {
    const isBusy = isDetecting;

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (!isBusy) {
                    onClose();
                }
            }}
            title="Detectar receta"
            size="xl"
            panelClassName="max-w-full sm:max-w-[55vw]"
        >
            <div className="space-y-5">
                <div className="rounded-3xl border border-nutrition-100 bg-nutrition-50/60 p-4 text-sm text-nutrition-900">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-nutrition-600 shadow-sm">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold">Pega una receta completa o una descripcion larga.</p>
                            <p className="mt-1 text-nutrition-800/80">
                                Se intentara detectar el titulo, las cantidades y relacionar los ingredientes con el
                                catalogo para agregarlos automaticamente.
                            </p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Texto de la receta</label>
                    <textarea
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        rows={14}
                        placeholder={`Ejemplo:\nPollo a la naranja\n\nIngredientes\n120 g de pechuga de pollo\n1 taza de jugo de naranja\n1 cucharadita de aceite de oliva\nSal y pimienta al gusto`}
                        disabled={isDetecting}
                        className="w-full rounded-3xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:bg-white focus:ring-2 focus:ring-nutrition-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                </div>

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                        {isCatalogLoading
                            ? 'Cargando catalogo de alimentos para detectar ingredientes...'
                            : 'El nombre actual no se reemplazara si ya escribiste uno manualmente.'}
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDetecting}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDetecting || isCatalogLoading || !value.trim()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-nutrition-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-nutrition-500/20 transition hover:bg-nutrition-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isDetecting || isCatalogLoading ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4" />
                            )}
                            {isCatalogLoading ? 'Cargando alimentos...' : isDetecting ? 'Detectando...' : 'Aceptar'}
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
