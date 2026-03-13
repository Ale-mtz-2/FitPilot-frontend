import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, ImagePlus, MoveHorizontal, MoveVertical, Trash2, ZoomIn } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import {
    blobToDataUrl,
    clamp,
    createCropDraftFromFile,
    DEFAULT_ACCEPTED_IMAGE_TYPES,
    getCropRect,
    ImageCropDraft,
    renderSquareCropToBlob,
    revokeDraftUrl,
} from '@/utils/imageProcessing';

const OUTPUT_SIZE = 512;
const PREVIEW_SIZE = 288;

type AdjustmentSliderProps = {
    label: string;
    valueLabel: string;
    min: number;
    max: number;
    step: number;
    value: number;
    disabled?: boolean;
    icon: ReactNode;
    minHint: string;
    maxHint: string;
    onChange: (value: number) => void;
};

interface RecipeImageUploaderProps {
    imageUrl?: string | null;
    onChange: (imageBlob: Blob, previewUrl: string) => void;
    onRemove: () => void;
    disabled?: boolean;
}

function AdjustmentSlider({
    label,
    valueLabel,
    min,
    max,
    step,
    value,
    disabled,
    icon,
    minHint,
    maxHint,
    onChange,
}: AdjustmentSliderProps) {
    const fillPercent = ((value - min) / (max - min)) * 100;

    return (
        <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-3 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                        {icon}
                    </span>
                    <span>{label}</span>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-600 tabular-nums">
                    {valueLabel}
                </span>
            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                disabled={disabled}
                aria-label={label}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-nutrition-600 [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(16,185,129,0.35)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-nutrition-600 [&::-moz-range-thumb]:shadow-sm"
                style={{
                    background: `linear-gradient(90deg, rgb(5 150 105) 0%, rgb(16 185 129) ${fillPercent}%, rgb(229 231 235) ${fillPercent}%, rgb(229 231 235) 100%)`,
                }}
            />

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-gray-400">
                <span>{minHint}</span>
                <span>{maxHint}</span>
            </div>
        </div>
    );
}

export function RecipeImageUploader({
    imageUrl,
    onChange,
    onRemove,
    disabled = false,
}: RecipeImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [displayImage, setDisplayImage] = useState<string | null>(imageUrl ?? null);
    const [draft, setDraft] = useState<ImageCropDraft | null>(null);
    const [zoom, setZoom] = useState(1.2);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartCoords = useRef<{ x: number; y: number } | null>(null);
    const dragStartOffsets = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        setDisplayImage(imageUrl ?? null);
    }, [imageUrl]);

    useEffect(() => {
        return () => {
            revokeDraftUrl(draft);
        };
    }, [draft]);

    const cropRect = useMemo(() => {
        if (!draft) {
            return null;
        }

        return getCropRect(draft.naturalWidth, draft.naturalHeight, zoom, offsetX, offsetY);
    }, [draft, offsetX, offsetY, zoom]);

    const previewStyle = useMemo(() => {
        if (!draft || !cropRect) {
            return undefined;
        }

        const scale = PREVIEW_SIZE / cropRect.side;
        return {
            width: `${draft.naturalWidth * scale}px`,
            height: `${draft.naturalHeight * scale}px`,
            left: `${-cropRect.sx * scale}px`,
            top: `${-cropRect.sy * scale}px`,
        };
    }, [cropRect, draft]);

    const closeCropModal = () => {
        setError(null);
        revokeDraftUrl(draft);
        setDraft(null);
        setZoom(1.2);
        setOffsetX(0);
        setOffsetY(0);

        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleFileSelected = async (file?: File) => {
        if (!file) {
            return;
        }

        setError(null);

        try {
            const nextDraft = await createCropDraftFromFile(file);
            revokeDraftUrl(draft);
            setDraft(nextDraft);
            setZoom(1.2);
            setOffsetX(0);
            setOffsetY(0);
        } catch (event: any) {
            setError(event?.message || 'No se pudo abrir la imagen.');
        }
    };

    const handleCropAndApply = async () => {
        if (!draft || !cropRect) {
            return;
        }

        setError(null);
        setIsProcessing(true);

        try {
            const compressedBlob = await renderSquareCropToBlob({
                draft,
                cropRect,
                outputSize: OUTPUT_SIZE,
            });
            const previewUrl = await blobToDataUrl(compressedBlob);

            onChange(compressedBlob, previewUrl);
            setDisplayImage(previewUrl);
            closeCropModal();
        } catch (event: any) {
            setError(event?.message || 'No se pudo aplicar la imagen.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        dragStartCoords.current = { x: event.clientX, y: event.clientY };
        dragStartOffsets.current = { x: offsetX, y: offsetY };
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging || !dragStartCoords.current || !dragStartOffsets.current || !draft || !cropRect) {
            return;
        }

        const deltaX = event.clientX - dragStartCoords.current.x;
        const deltaY = event.clientY - dragStartCoords.current.y;
        const scale = PREVIEW_SIZE / cropRect.side;
        const maxX = Math.max(0, (draft.naturalWidth - cropRect.side) / 2);
        const maxY = Math.max(0, (draft.naturalHeight - cropRect.side) / 2);

        let newOffsetX = dragStartOffsets.current.x;
        if (maxX > 0) {
            newOffsetX -= (deltaX * 100) / (maxX * scale);
        }

        let newOffsetY = dragStartOffsets.current.y;
        if (maxY > 0) {
            newOffsetY -= (deltaY * 100) / (maxY * scale);
        }

        setOffsetX(clamp(Math.round(newOffsetX), -100, 100));
        setOffsetY(clamp(Math.round(newOffsetY), -100, 100));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) {
            return;
        }

        setIsDragging(false);
        dragStartCoords.current = null;
        dragStartOffsets.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5">
                <div className="mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Imagen de la receta</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Usa el mismo pipeline optimizado del avatar para ahorrar espacio en storage.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="relative h-44 w-44 overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white shadow-sm">
                            {displayImage ? (
                                <img
                                    src={displayImage}
                                    alt="Imagen de receta"
                                    className="h-full w-full object-cover"
                                    onError={() => setDisplayImage(null)}
                                />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center text-center text-gray-400">
                                    <ImagePlus className="mb-3 h-10 w-10 text-nutrition-500" />
                                    <span className="max-w-[120px] text-sm font-medium">
                                        Agrega una foto de portada
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            disabled={disabled || isProcessing}
                            className="inline-flex items-center gap-2 rounded-2xl bg-nutrition-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-nutrition-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Camera className="h-4 w-4" />
                            {displayImage ? 'Cambiar imagen' : 'Subir imagen'}
                        </button>
                        {displayImage ? (
                            <button
                                type="button"
                                onClick={onRemove}
                                disabled={disabled || isProcessing}
                                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                Quitar
                            </button>
                        ) : null}
                    </div>

                    <input
                        ref={inputRef}
                        type="file"
                        accept={DEFAULT_ACCEPTED_IMAGE_TYPES.join(',')}
                        className="hidden"
                        onChange={(event) => handleFileSelected(event.target.files?.[0])}
                    />

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}
                </div>
            </div>

            <Modal
                isOpen={Boolean(draft)}
                onClose={() => {
                    if (!isProcessing) {
                        closeCropModal();
                    }
                }}
                title="Recortar imagen de receta"
                size="lg"
            >
                {draft && cropRect ? (
                    <div className="space-y-5">
                        <div className="flex flex-col gap-5 lg:flex-row">
                            <div className="mx-auto lg:mx-0">
                                <div
                                    className={`relative h-72 w-72 touch-none select-none overflow-hidden rounded-2xl border border-gray-200 bg-white ${
                                        isDragging ? 'cursor-grabbing' : 'cursor-grab'
                                    }`}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    onPointerCancel={handlePointerUp}
                                >
                                    <img
                                        src={draft.src}
                                        alt="Previsualizacion de recorte"
                                        className="pointer-events-none absolute max-w-none select-none"
                                        style={previewStyle}
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 ring-1 ring-inset ring-black/5 pointer-events-none" />
                                </div>
                            </div>

                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-gray-600">
                                    Ajusta el recorte cuadrado. La imagen se comprimira automaticamente por debajo de 1MB.
                                </p>

                                <div className="space-y-3">
                                    <AdjustmentSlider
                                        label="Zoom"
                                        valueLabel={`${zoom.toFixed(2)}x`}
                                        min={1}
                                        max={3}
                                        step={0.05}
                                        value={zoom}
                                        onChange={setZoom}
                                        disabled={isProcessing}
                                        icon={<ZoomIn className="h-4 w-4" />}
                                        minHint="1x"
                                        maxHint="3x"
                                    />

                                    <AdjustmentSlider
                                        label="Horizontal"
                                        valueLabel={`${offsetX > 0 ? '+' : ''}${offsetX}`}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={offsetX}
                                        onChange={setOffsetX}
                                        disabled={isProcessing}
                                        icon={<MoveHorizontal className="h-4 w-4" />}
                                        minHint="Izquierda"
                                        maxHint="Derecha"
                                    />

                                    <AdjustmentSlider
                                        label="Vertical"
                                        valueLabel={`${offsetY > 0 ? '+' : ''}${offsetY}`}
                                        min={-100}
                                        max={100}
                                        step={1}
                                        value={offsetY}
                                        onChange={setOffsetY}
                                        disabled={isProcessing}
                                        icon={<MoveVertical className="h-4 w-4" />}
                                        minHint="Arriba"
                                        maxHint="Abajo"
                                    />
                                </div>
                            </div>
                        </div>

                        {error ? (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </div>
                        ) : null}

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeCropModal}
                                disabled={isProcessing}
                                className="rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleCropAndApply}
                                disabled={isProcessing}
                                className="inline-flex items-center gap-2 rounded-xl bg-nutrition-600 px-4 py-2 font-medium text-white transition hover:bg-nutrition-700 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                ) : null}
                                Aplicar imagen
                            </button>
                        </div>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
}
