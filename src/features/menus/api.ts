import { nutritionApi } from "@/api/clients/nutrition.client";
import { IMenu, IMenuDraft } from './types';

export const getMenus = async (professionalId?: number): Promise<IMenu[]> => {
    const params = professionalId ? { professional_id: professionalId } : {};
    const { data } = await nutritionApi.get('/v1/menus', { params });
    return data;
};

export const getMenuById = async (id: number): Promise<IMenu> => {
    const { data } = await nutritionApi.get(`/v1/menus/${id}`);
    return data;
};

export const saveMenuDraft = async (data: any): Promise<{ id: number }> => {
    const response = await nutritionApi.post('/v1/menus/draft', data);
    return response.data;
};

// Removed duplicate import

export const updateMenuDraft = async (id: number | string, data: any): Promise<void> => {
    await nutritionApi.patch(`/v1/menus/draft/${id}`, data);
};

export const getDrafts = async (professionalId: number, clientId?: number | null): Promise<IMenuDraft[]> => {
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    const { data } = await nutritionApi.get<IMenuDraft[]>('/v1/menus/draft', { params });
    return data;
};

export const getDraftById = async (id: string): Promise<IMenuDraft> => {
    const { data } = await nutritionApi.get<IMenuDraft>(`/v1/menus/draft/${id}`);
    return data;
};


export const createMenu = async (menuData: Partial<IMenu>): Promise<IMenu> => {
    const { data } = await nutritionApi.post('/v1/menus', menuData);
    return data;
};

export const updateMenu = async (id: number, menuData: Partial<IMenu>): Promise<IMenu> => {
    const { data } = await nutritionApi.patch(`/v1/menus/${id}`, menuData);
    return data;
};

export const deleteMenu = async (id: number): Promise<void> => {
    await nutritionApi.delete(`/v1/menus/${id}`);
};

// Payload for swapping daily menu
export interface SwapDailyMenuPayload {
    client_id: number;
    date: string;
    new_menu_id: number;
}

export const swapDailyMenu = async (payload: SwapDailyMenuPayload): Promise<void> => {
    await nutritionApi.patch('/v1/menus/daily/swap', payload);
};

export const getMenuPool = async (professionalId: number, clientId?: number, date?: string): Promise<any[]> => {
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    if (date) params.date = date;
    
    // The endpoint returns an array of menus (IMenuPool)
    const { data } = await nutritionApi.get('/v1/menus/pool', { params });
    return data;
};

export const getMenuPoolCalendar = async (professionalId: number, clientId?: number, date?: string): Promise<any[]> => {
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    if (date) params.date = date;
    
    // The endpoint returns an array of menus (IMenuPool)
    const { data } = await nutritionApi.get('/v1/menus/pool/calendar', { params });
    return data;
};

import { GenerateAiMenuDto } from './types';

export const generateMenuAI = async (data: GenerateAiMenuDto): Promise<any> => {
    // Increase timeout to 120 seconds (2 minutes) for AI generation
    const { data: response } = await nutritionApi.post('/v1/menus/ai-generate', data, { timeout: 120000 });
    return response;
};
