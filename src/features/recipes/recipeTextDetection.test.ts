import { describe, expect, it } from 'vitest';

import { detectRecipeFromText } from '@/features/recipes/recipeTextDetection';
import type { IFoodItem } from '@/features/foods/types';

const buildFood = (id: number, name: string): IFoodItem => ({
    id,
    name,
    brand: null,
    exchange_group_id: null,
    base_serving_size: null,
    base_unit: null,
    calories_kcal: null,
    protein_g: null,
    carbs_g: null,
    fat_g: null,
    fiber_g: null,
    serving_units: [],
});

describe('detectRecipeFromText', () => {
    it('normaliza cuantificadores culinarios a ingrediente canónico', () => {
        const foods = [buildFood(1, 'Cebolla'), buildFood(2, 'Cilantro')];

        const result = detectRecipeFromText({
            text: 'Ingredientes:\nun trozo de cebolla\nun manojo pequeño de cilantro',
            foods,
        });

        expect(result.unmatchedIngredients).toEqual([]);
        expect(result.matchedIngredients.map((item) => item.food.name)).toEqual(['Cebolla', 'Cilantro']);
    });

    it('acepta variantes sin acento de adjetivos de tamaño', () => {
        const foods = [buildFood(1, 'Cilantro')];

        const result = detectRecipeFromText({
            text: 'Ingredientes:\nuna ramita pequeno de cilantro',
            foods,
        });

        expect(result.unmatchedIngredients).toEqual([]);
        expect(result.matchedIngredients.map((item) => item.food.name)).toEqual(['Cilantro']);
    });

    it('elimina secuencias un|una + cuantificador + de antes del matching', () => {
        const foods = [buildFood(1, 'Cebolla')];

        const result = detectRecipeFromText({
            text: 'Ingredientes:\nuna pizca de cebolla',
            foods,
        });

        expect(result.unmatchedIngredients).toEqual([]);
        expect(result.matchedIngredients.map((item) => item.food.name)).toEqual(['Cebolla']);
    });
});

