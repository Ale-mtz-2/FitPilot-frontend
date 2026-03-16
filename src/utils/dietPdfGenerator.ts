import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '../assets/fitpilot-logo.png';
import type { DietPdfDocument, DietPdfIngredient, DietPdfRecipe } from '@/features/menus/types';

type JsPdfWithTable = jsPDF & {
    lastAutoTable?: {
        finalY: number;
    };
};

const PAGE_MARGIN = 14;
const SUMMARY_CARD_HEIGHT = 24;

const colors = {
    primary: [16, 185, 129] as const,
    primaryDark: [6, 95, 70] as const,
    primaryLight: [209, 250, 229] as const,
    slate: [51, 65, 85] as const,
    muted: [100, 116, 139] as const,
    border: [226, 232, 240] as const,
    surface: [248, 250, 252] as const,
    white: [255, 255, 255] as const,
    orange: [249, 115, 22] as const,
};

const sanitizeFileName = (value: string | null | undefined) =>
    (value || '')
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_');

const formatCalories = (value: number | null) =>
    value !== null && value > 0 ? `${Math.round(value)} kcal` : 'Sin calorías';

export const formatDietPdfPortion = (ingredient: DietPdfIngredient) => {
    const parts = ingredient.portion.householdLabel
        ? [
            ingredient.portion.householdLabel,
            ingredient.portion.grams !== null ? `${ingredient.portion.grams} g` : null,
        ]
        : [
            ingredient.portion.equivalents !== null ? `${ingredient.portion.equivalents} eq` : null,
            ingredient.portion.grams !== null ? `${ingredient.portion.grams} g` : null,
        ];

    return parts.length > 0 ? parts.join(' • ') : 'Sin porción';
};

const toMutableColor = (color: readonly [number, number, number]): [number, number, number] => [
    color[0],
    color[1],
    color[2],
];

const ensureSpace = (doc: jsPDF, currentY: number, requiredHeight: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (currentY + requiredHeight <= pageHeight - PAGE_MARGIN - 8) {
        return currentY;
    }

    doc.addPage();
    return PAGE_MARGIN + 6;
};

const drawImagePlaceholder = (doc: jsPDF, x: number, y: number, size: number) => {
    doc.setFillColor(...colors.primaryLight);
    doc.roundedRect(x, y, size, size, 3, 3, 'F');
    doc.setTextColor(...colors.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('RECETA', x + size / 2, y + size / 2 + 1, { align: 'center' });
};

const resolveImageFormat = (value: string) => {
    const match = /^data:image\/([a-zA-Z0-9+.-]+);/i.exec(value);
    const format = match?.[1]?.toUpperCase();

    if (format === 'PNG' || format === 'JPEG' || format === 'JPG' || format === 'WEBP') {
        return format === 'JPG' ? 'JPEG' : format;
    }

    return 'PNG';
};

export const loadPdfImageAsBase64 = async (url: string | null | undefined): Promise<string | null> => {
    if (!url) {
        return null;
    }

    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            return null;
        }

        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
};

const collectRecipeImageUrls = (documentData: DietPdfDocument) =>
    Array.from(
        new Set(
            documentData.days.flatMap((day) =>
                day.meals.flatMap((meal) => meal.recipes.map((recipe) => recipe.imageUrl).filter(Boolean)),
            ),
        ),
    ) as string[];

const preloadRecipeImages = async (documentData: DietPdfDocument) => {
    const [logoBase64, ...recipeImages] = await Promise.all([
        loadPdfImageAsBase64(logoImage),
        ...collectRecipeImageUrls(documentData).map((url) => loadPdfImageAsBase64(url)),
    ]);
    const imageMap = new Map<string, string | null>();

    collectRecipeImageUrls(documentData).forEach((url, index) => {
        imageMap.set(url, recipeImages[index] ?? null);
    });

    return {
        logoBase64,
        imageMap,
    };
};

const drawDocumentHeader = (
    doc: jsPDF,
    documentData: DietPdfDocument,
    logoBase64: string | null,
) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = PAGE_MARGIN;

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', pageWidth - PAGE_MARGIN - 16, yPos - 2, 16, 16);
    } else {
        doc.setFillColor(...colors.primary);
        doc.circle(pageWidth - PAGE_MARGIN - 8, yPos + 6, 8, 'F');
        doc.setTextColor(...colors.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('FP', pageWidth - PAGE_MARGIN - 8, yPos + 8, { align: 'center' });
    }

    doc.setTextColor(...colors.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(documentData.title, PAGE_MARGIN, yPos + 8);

    if (documentData.subtitle) {
        doc.setTextColor(...colors.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(documentData.subtitle, PAGE_MARGIN, yPos + 15);
    }

    yPos += 24;

    doc.setFillColor(...colors.surface);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN * 2, 24, 4, 4, 'FD');

    doc.setTextColor(...colors.muted);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', PAGE_MARGIN + 4, yPos + 6);
    doc.text('PERIODO', PAGE_MARGIN + 66, yPos + 6);
    doc.text('IMPRESO', PAGE_MARGIN + 128, yPos + 6);

    doc.setTextColor(...colors.slate);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(documentData.clientName || 'Sin cliente seleccionado', PAGE_MARGIN + 4, yPos + 13);
    doc.text(documentData.periodLabel || 'Sin periodo', PAGE_MARGIN + 66, yPos + 13);
    doc.text(documentData.printedAt, PAGE_MARGIN + 128, yPos + 13);

    return yPos + 32;
};

const drawSummaryCards = (doc: jsPDF, documentData: DietPdfDocument, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const cardGap = 4;
    const cardWidth = (pageWidth - PAGE_MARGIN * 2 - cardGap * 3) / 4;
    const cards: Array<{
        label: string;
        value: string;
        accent: readonly [number, number, number];
    }> = [
        { label: 'Días', value: String(documentData.summary.totalDays), accent: colors.primary },
        { label: 'Comidas', value: String(documentData.summary.totalMeals), accent: colors.orange },
        { label: 'Recetas', value: String(documentData.summary.totalRecipes), accent: colors.primaryDark },
        {
            label: 'Calorías',
            value:
                documentData.summary.totalCalories !== null
                    ? `${Math.round(documentData.summary.totalCalories)} kcal`
                    : '—',
            accent: colors.slate,
        },
    ];

    cards.forEach((card, index) => {
        const x = PAGE_MARGIN + index * (cardWidth + cardGap);
        doc.setFillColor(...colors.white);
        doc.setDrawColor(...colors.border);
        doc.roundedRect(x, startY, cardWidth, SUMMARY_CARD_HEIGHT, 4, 4, 'FD');
        doc.setFillColor(card.accent[0], card.accent[1], card.accent[2]);
        doc.roundedRect(x + 3, startY + 3, 10, 10, 2, 2, 'F');
        doc.setTextColor(...colors.muted);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(card.label.toUpperCase(), x + 16, startY + 7);
        doc.setTextColor(...colors.slate);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(card.value, x + 16, startY + 15);
    });

    return startY + SUMMARY_CARD_HEIGHT + 10;
};

const drawDayHeader = (doc: jsPDF, title: string, subtitle: string | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const yPos = PAGE_MARGIN + 6;

    doc.setFillColor(...colors.primary);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN * 2, 18, 5, 5, 'F');
    doc.setTextColor(...colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(title, PAGE_MARGIN + 5, yPos + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle || 'Sin menú asignado', PAGE_MARGIN + 5, yPos + 13);

    return yPos + 24;
};

const drawMealHeader = (doc: jsPDF, mealName: string, calories: number | null, startY: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...colors.surface);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(PAGE_MARGIN, startY, pageWidth - PAGE_MARGIN * 2, 16, 4, 4, 'FD');
    doc.setTextColor(...colors.slate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(mealName, PAGE_MARGIN + 4, startY + 7);
    doc.setTextColor(...colors.orange);
    doc.setFontSize(10);
    doc.text(formatCalories(calories), pageWidth - PAGE_MARGIN - 4, startY + 7, { align: 'right' });

    return startY + 20;
};

const renderRecipeSection = async (
    doc: JsPdfWithTable,
    recipe: DietPdfRecipe,
    startY: number,
    imageMap: Map<string, string | null>,
) => {
    let yPos = ensureSpace(doc, startY, 28);
    const pageWidth = doc.internal.pageSize.getWidth();
    const imageX = PAGE_MARGIN;
    const imageSize = 24;
    const contentX = imageX + imageSize + 4;

    doc.setFillColor(...colors.white);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(PAGE_MARGIN, yPos, pageWidth - PAGE_MARGIN * 2, 26, 4, 4, 'FD');

    const imageBase64 = recipe.imageUrl ? imageMap.get(recipe.imageUrl) ?? null : null;
    if (imageBase64) {
        doc.addImage(
            imageBase64,
            resolveImageFormat(imageBase64),
            imageX + 1,
            yPos + 1,
            imageSize - 2,
            imageSize - 2,
        );
    } else {
        drawImagePlaceholder(doc, imageX + 1, yPos + 1, imageSize - 2);
    }

    doc.setTextColor(...colors.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(recipe.title, contentX, yPos + 8);
    doc.setTextColor(...colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(
        `${recipe.ingredientCount} ingrediente${recipe.ingredientCount === 1 ? '' : 's'}`,
        contentX,
        yPos + 14,
    );
    doc.text('Ingredientes y porciones de la receta dentro del plan', contentX, yPos + 19);

    autoTable(doc, {
        startY: yPos + 30,
        margin: {
            left: PAGE_MARGIN,
            right: PAGE_MARGIN,
        },
        theme: 'grid',
        head: [['Ingrediente', 'Grupo', 'Porción']],
        body: recipe.ingredients.map((ingredient) => [
            ingredient.label,
            ingredient.exchangeGroupName || '—',
            formatDietPdfPortion(ingredient),
        ]),
        headStyles: {
            fillColor: toMutableColor(colors.primary),
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 2.5,
            lineColor: toMutableColor(colors.border),
            lineWidth: 0.15,
            textColor: toMutableColor(colors.slate),
        },
        alternateRowStyles: {
            fillColor: toMutableColor(colors.surface),
        },
    });

    return (doc.lastAutoTable?.finalY ?? yPos + 30) + 6;
};

const renderStandaloneFoodsTable = (
    doc: JsPdfWithTable,
    ingredients: DietPdfIngredient[],
    startY: number,
) => {
    const yPos = ensureSpace(doc, startY, 18);
    doc.setTextColor(...colors.primaryDark);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Alimentos sueltos', PAGE_MARGIN, yPos);

    autoTable(doc, {
        startY: yPos + 3,
        margin: {
            left: PAGE_MARGIN,
            right: PAGE_MARGIN,
        },
        theme: 'grid',
        head: [['Alimento', 'Grupo', 'Porción']],
        body: ingredients.map((ingredient) => [
            ingredient.label,
            ingredient.exchangeGroupName || '—',
            formatDietPdfPortion(ingredient),
        ]),
        headStyles: {
            fillColor: toMutableColor(colors.primaryDark),
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        styles: {
            fontSize: 8.5,
            cellPadding: 2.5,
            lineColor: toMutableColor(colors.border),
            lineWidth: 0.15,
            textColor: toMutableColor(colors.slate),
        },
        alternateRowStyles: {
            fillColor: toMutableColor(colors.surface),
        },
    });

    return (doc.lastAutoTable?.finalY ?? yPos + 3) + 6;
};

const addFooters = (doc: jsPDF) => {
    const totalPages = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setDrawColor(...colors.border);
        doc.line(PAGE_MARGIN, pageHeight - 11, pageWidth - PAGE_MARGIN, pageHeight - 11);
        doc.setTextColor(...colors.muted);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Generado con FitPilot', PAGE_MARGIN, pageHeight - 6);
        doc.text(`Página ${page} de ${totalPages}`, pageWidth - PAGE_MARGIN, pageHeight - 6, { align: 'right' });
    }
};

export const buildDietPdfFileName = (documentData: DietPdfDocument) => {
    const clientSegment = sanitizeFileName(documentData.clientName) || 'sin_cliente';
    const periodSegment = sanitizeFileName(documentData.periodLabel) || documentData.source;
    return `${sanitizeFileName(documentData.title) || 'menu_nutricional'}_${clientSegment}_${periodSegment}.pdf`;
};

export const buildDietPdf = async (documentData: DietPdfDocument): Promise<jsPDF> => {
    const doc = new jsPDF() as JsPdfWithTable;
    const { logoBase64, imageMap } = await preloadRecipeImages(documentData);

    let yPos = drawDocumentHeader(doc, documentData, logoBase64);
    yPos = drawSummaryCards(doc, documentData, yPos);
    doc.setTextColor(...colors.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(
        'Las siguientes páginas incluyen el detalle por día, comida, receta, ingredientes y porciones.',
        PAGE_MARGIN,
        yPos,
    );

    for (let dayIndex = 0; dayIndex < documentData.days.length; dayIndex += 1) {
        const day = documentData.days[dayIndex];
        doc.addPage();
        yPos = drawDayHeader(doc, day.title, day.subtitle);

        if (day.meals.length === 0) {
            doc.setTextColor(...colors.muted);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text('No hay comidas asignadas para este día.', PAGE_MARGIN, yPos + 6);
            continue;
        }

        for (const meal of day.meals) {
            yPos = ensureSpace(doc, yPos, 20);
            yPos = drawMealHeader(doc, meal.name, meal.totalCalories, yPos);

            if (meal.recipes.length === 0 && meal.standaloneFoods.length === 0) {
                doc.setTextColor(...colors.muted);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text('Esta comida no tiene alimentos cargados todavía.', PAGE_MARGIN, yPos);
                yPos += 8;
                continue;
            }

            for (const recipe of meal.recipes) {
                yPos = await renderRecipeSection(doc, recipe, yPos, imageMap);
            }

            if (meal.standaloneFoods.length > 0) {
                yPos = renderStandaloneFoodsTable(doc, meal.standaloneFoods, yPos);
            }

            yPos += 2;
        }
    }

    addFooters(doc);
    return doc;
};

export const generateDietPdf = async (documentData: DietPdfDocument): Promise<void> => {
    const doc = await buildDietPdf(documentData);
    doc.save(buildDietPdfFileName(documentData));
};
