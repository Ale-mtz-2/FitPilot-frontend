import { resolveRecipeImageUrl } from '@/utils/recipeImages';
import type { RecipeDetail, RecipeListItem } from './types';

type RecipeImageShape = {
    image_url?: string | null;
    image_key?: string | null;
};

type RawRecipeListItem = Omit<RecipeListItem, 'image_url'> & RecipeImageShape;
type RawRecipeDetail = Omit<RecipeDetail, 'image_url'> & RecipeImageShape;

const normalizeRecipeImage = (recipe: RecipeImageShape): string | null =>
    resolveRecipeImageUrl(recipe.image_url ?? recipe.image_key ?? null);

export const normalizeRecipeListItem = (recipe: RawRecipeListItem): RecipeListItem => ({
    ...recipe,
    image_url: normalizeRecipeImage(recipe),
});

export const normalizeRecipeDetail = (recipe: RawRecipeDetail): RecipeDetail => ({
    ...recipe,
    image_url: normalizeRecipeImage(recipe),
});
