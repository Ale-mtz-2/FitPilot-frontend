export const DEFAULT_ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const DEFAULT_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const DEFAULT_MAX_OUTPUT_BYTES = 1024 * 1024;

export type ImageCropDraft = {
    src: string;
    naturalWidth: number;
    naturalHeight: number;
};

export type CropRect = {
    sx: number;
    sy: number;
    side: number;
};

type CreateCropDraftOptions = {
    acceptedTypes?: string[];
    maxSourceBytes?: number;
};

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function getCropRect(
    width: number,
    height: number,
    zoom: number,
    offsetX: number,
    offsetY: number,
): CropRect {
    const baseSide = Math.min(width, height);
    const side = clamp(baseSide / zoom, 64, baseSide);
    const maxX = Math.max(0, (width - side) / 2);
    const maxY = Math.max(0, (height - side) / 2);

    const sx = clamp(width / 2 - side / 2 + (offsetX / 100) * maxX, 0, width - side);
    const sy = clamp(height / 2 - side / 2 + (offsetY / 100) * maxY, 0, height - side);

    return { sx, sy, side };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('No se pudo cargar la imagen seleccionada.'));
        img.src = src;
    });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('No se pudo procesar la imagen.'));
                return;
            }

            resolve(blob);
        }, type, quality);
    });
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer la imagen procesada.'));
        reader.readAsDataURL(blob);
    });
}

export async function createCropDraftFromFile(
    file: File,
    options: CreateCropDraftOptions = {},
): Promise<ImageCropDraft> {
    const acceptedTypes = options.acceptedTypes ?? DEFAULT_ACCEPTED_IMAGE_TYPES;
    const maxSourceBytes = options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;

    if (!acceptedTypes.includes(file.type)) {
        throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.');
    }

    if (file.size > maxSourceBytes) {
        throw new Error('La imagen es demasiado grande para procesarla. Usa una menor a 12MB.');
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await loadImage(objectUrl);
        return {
            src: objectUrl,
            naturalWidth: image.naturalWidth || image.width,
            naturalHeight: image.naturalHeight || image.height,
        };
    } catch (error) {
        URL.revokeObjectURL(objectUrl);
        throw error;
    }
}

export function revokeDraftUrl(draft?: ImageCropDraft | null) {
    if (draft?.src?.startsWith('blob:')) {
        URL.revokeObjectURL(draft.src);
    }
}

function downscaleCanvas(sourceCanvas: HTMLCanvasElement, nextSize: number) {
    const canvas = document.createElement('canvas');
    canvas.width = nextSize;
    canvas.height = nextSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No se pudo redimensionar la imagen.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, nextSize, nextSize);
    return canvas;
}

export async function compressCanvasUnderSize(
    canvas: HTMLCanvasElement,
    maxBytes = DEFAULT_MAX_OUTPUT_BYTES,
): Promise<Blob> {
    const qualitySteps = [0.92, 0.84, 0.76, 0.68, 0.6, 0.5, 0.4];
    let workingCanvas = canvas;
    let bestBlob: Blob | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        for (const quality of qualitySteps) {
            const blob = await canvasToBlob(workingCanvas, 'image/jpeg', quality);

            if (!bestBlob || blob.size < bestBlob.size) {
                bestBlob = blob;
            }

            if (blob.size <= maxBytes) {
                return blob;
            }
        }

        if (workingCanvas.width <= 256) {
            break;
        }

        const nextSize = Math.max(256, Math.round(workingCanvas.width * 0.85));
        workingCanvas = downscaleCanvas(workingCanvas, nextSize);
    }

    if (!bestBlob) {
        throw new Error('No se pudo comprimir la imagen.');
    }

    if (bestBlob.size > maxBytes) {
        throw new Error('La imagen sigue pesando mas de 1MB incluso despues de comprimirla.');
    }

    return bestBlob;
}

export async function renderSquareCropToBlob(params: {
    draft: ImageCropDraft;
    cropRect: CropRect;
    outputSize?: number;
    maxBytes?: number;
    backgroundColor?: string;
}): Promise<Blob> {
    const {
        draft,
        cropRect,
        outputSize = 512,
        maxBytes = DEFAULT_MAX_OUTPUT_BYTES,
        backgroundColor = '#ffffff',
    } = params;
    const image = await loadImage(draft.src);
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('No se pudo preparar el recorte.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(
        image,
        cropRect.sx,
        cropRect.sy,
        cropRect.side,
        cropRect.side,
        0,
        0,
        outputSize,
        outputSize,
    );

    return compressCanvasUnderSize(canvas, maxBytes);
}
