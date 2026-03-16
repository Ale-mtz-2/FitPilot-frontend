import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DietPdfDocument } from '@/features/menus/types';
import { buildDietPdf, formatDietPdfPortion, loadPdfImageAsBase64 } from './dietPdfGenerator';

const sampleDocument: DietPdfDocument = {
    title: 'Menú nutricional',
    subtitle: 'Documento de prueba',
    clientName: 'Cliente Demo',
    periodLabel: '10 Mar 2026 - 16 Mar 2026',
    printedAt: '14 Mar 2026, 18:00',
    source: 'weekly',
    summary: {
        totalDays: 1,
        totalMeals: 1,
        totalRecipes: 1,
        totalStandaloneFoods: 1,
        totalCalories: 520,
    },
    days: [
        {
            id: 'day-1',
            title: 'Lunes 10 Mar',
            subtitle: 'Menú principal',
            dateKey: '2026-03-10',
            meals: [
                {
                    id: 'meal-1',
                    name: 'Comida',
                    totalCalories: 520,
                    recipes: [
                        {
                            id: 'recipe-1',
                            recipeId: 20,
                            title: 'Bowl proteico',
                            imageUrl: 'https://cdn.fitpilot.fit/recipes/20/1/bowl.jpg',
                            ingredientCount: 2,
                            ingredients: [
                                {
                                    id: 'ingredient-1',
                                    label: 'Arroz',
                                    exchangeGroupName: 'Cereales',
                                    portion: {
                                        householdLabel: '1 taza',
                                        equivalents: 1,
                                        grams: 120,
                                    },
                                },
                                {
                                    id: 'ingredient-2',
                                    label: 'Pollo',
                                    exchangeGroupName: 'AOA',
                                    portion: {
                                        householdLabel: null,
                                        equivalents: 1,
                                        grams: 140,
                                    },
                                },
                            ],
                        },
                    ],
                    standaloneFoods: [
                        {
                            id: 'food-1',
                            label: 'Pepino',
                            exchangeGroupName: 'Verduras',
                            portion: {
                                householdLabel: '1 taza',
                                equivalents: 1,
                                grams: 90,
                            },
                        },
                    ],
                },
            ],
        },
    ],
};

describe('dietPdfGenerator', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns null when image loading fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

        await expect(loadPdfImageAsBase64('https://cdn.fitpilot.fit/recipes/20/1/bowl.jpg')).resolves.toBeNull();
    });

    it('prioritizes household labels when formatting portions', () => {
        expect(formatDietPdfPortion(sampleDocument.days[0].meals[0].recipes[0].ingredients[0])).toBe('1 taza • 120 g');
        expect(formatDietPdfPortion(sampleDocument.days[0].meals[0].recipes[0].ingredients[1])).toBe('1 eq • 140 g');
    });

    it('builds a pdf document without throwing when all images fail to load', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

        const doc = await buildDietPdf(sampleDocument);

        expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    });
});
