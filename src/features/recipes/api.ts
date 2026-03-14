import { nutritionApi } from '@/api/clients/nutrition.client';
import type { RecipeDetail, RecipeListItem, RecipeScope, RecipeUpsertInput } from './types';
import { normalizeRecipeDetail, normalizeRecipeListItem } from './normalizers';

export const getRecipeCatalog = async (scope: RecipeScope = 'all'): Promise<RecipeListItem[]> => {
    const response = await nutritionApi.get<RecipeListItem[]>('/v1/recipes', {
        params: { scope },
    });
    return response.data.map(normalizeRecipeListItem);
};

export const getRecipeById = async (id: number): Promise<RecipeDetail> => {
    const response = await nutritionApi.get<RecipeDetail>(`/v1/recipes/${id}`);
    return normalizeRecipeDetail(response.data);
};

export const createRecipe = async (data: RecipeUpsertInput): Promise<RecipeDetail> => {
    const response = await nutritionApi.post<RecipeDetail>('/v1/recipes', data);
    return normalizeRecipeDetail(response.data);
};

export const updateRecipe = async (id: number, data: RecipeUpsertInput): Promise<RecipeDetail> => {
    const response = await nutritionApi.patch<RecipeDetail>(`/v1/recipes/${id}`, data);
    return normalizeRecipeDetail(response.data);
};

export const deleteRecipe = async (id: number): Promise<{ id: number; deleted: boolean }> => {
    const response = await nutritionApi.delete<{ id: number; deleted: boolean }>(`/v1/recipes/${id}`);
    return response.data;
};

export const duplicateRecipe = async (id: number): Promise<RecipeDetail> => {
    const response = await nutritionApi.post<RecipeDetail>(`/v1/recipes/${id}/duplicate`);
    return normalizeRecipeDetail(response.data);
};

export const uploadRecipeImage = async (id: number, imageBlob: Blob): Promise<RecipeDetail> => {
    const formData = new FormData();
    const fileName =
        imageBlob instanceof File && imageBlob.name
            ? imageBlob.name
            : `recipe-${id}-${Date.now()}.jpg`;

    formData.append('file', imageBlob, fileName);
    const response = await nutritionApi.patch<RecipeDetail>(`/v1/recipes/${id}/image`, formData);
    return normalizeRecipeDetail(response.data);
};

export const deleteRecipeImage = async (id: number): Promise<RecipeDetail> => {
    const response = await nutritionApi.delete<RecipeDetail>(`/v1/recipes/${id}/image`);
    return normalizeRecipeDetail(response.data);
};
