import { describe, expect, it } from 'vitest';
import { normalizeRecipeDetail, normalizeRecipeListItem } from './normalizers';

describe('recipe normalizers', () => {
    it('maps legacy image_key to image_url for catalog items', () => {
        const result = normalizeRecipeListItem({
            id: 4,
            name: 'Nopales con huevo',
            description: null,
            created_by: 4,
            is_template: false,
            created_at: '2026-03-14T02:03:50.864Z',
            updated_at: '2026-03-14T02:03:52.580Z',
            ingredient_count: 2,
            image_key: 'recipes/4/4/1773453831902-recipe-4-1773453831771.jpg',
        });

        expect(result.image_url).toBe(
            'https://cdn.fitpilot.fit/recipes/4/4/1773453831902-recipe-4-1773453831771.jpg',
        );
    });

    it('preserves absolute cloudflare image_url for detail payloads', () => {
        const result = normalizeRecipeDetail({
            id: 1,
            name: 'Pollo a la Naranja',
            description: null,
            created_by: 4,
            is_template: false,
            created_at: '2026-03-13T19:38:43.915Z',
            updated_at: '2026-03-13T19:38:43.915Z',
            ingredient_count: 5,
            image_url: 'https://cdn.fitpilot.fit/recipes/4/1/1773430723413-recipe-1-1773430723276.jpg',
            ingredients: [],
        });

        expect(result.image_url).toBe(
            'https://cdn.fitpilot.fit/recipes/4/1/1773430723413-recipe-1-1773430723276.jpg',
        );
    });
});
