import { nutritionApi } from "@/api/clients/nutrition.client";
import {
    GenerateAiMenuDto,
    GenerateAiMenuResponse,
    MenuDailyBatchResponseItem,
    IMenu,
    IMenuCalendarSummary,
    IMenuDraft,
    IMenuPoolSummary,
    IReusableMenuSummary,
} from './types';
import { assertNutritionSubscriptionAccess } from '@/features/subscriptions/nutritionAccess';

export const getReusableMenuSummary = async (
    professionalId: number,
    clientId?: number,
): Promise<IReusableMenuSummary[]> => {
    assertNutritionSubscriptionAccess();
    const params: Record<string, number> = { professional_id: professionalId };
    if (clientId) {
        params.client_id = clientId;
    }
    const { data } = await nutritionApi.get('/v1/menus/reusable/summary', { params });
    return data;
};

export const getMenuById = async (id: number): Promise<IMenu> => {
    assertNutritionSubscriptionAccess();
    const { data } = await nutritionApi.get(`/v1/menus/${id}`);
    return data;
};

export const getClientDailyMenuBatch = async (
    clientId: number,
    date: string,
    days = 7,
): Promise<MenuDailyBatchResponseItem[]> => {
    assertNutritionSubscriptionAccess();
    const { data } = await nutritionApi.get<MenuDailyBatchResponseItem[]>('/v1/menus/daily/batch', {
        params: {
            client_id: clientId,
            date,
            days,
        },
    });
    return data;
};

export const saveMenuDraft = async (data: any): Promise<{ id: number }> => {
    assertNutritionSubscriptionAccess();
    const response = await nutritionApi.post('/v1/menus/draft', data);
    return response.data;
};

// Removed duplicate import

export const updateMenuDraft = async (id: number | string, data: any): Promise<void> => {
    assertNutritionSubscriptionAccess();
    await nutritionApi.patch(`/v1/menus/draft/${id}`, data);
};

export const getDrafts = async (professionalId: number, clientId?: number | null): Promise<IMenuDraft[]> => {
    assertNutritionSubscriptionAccess();
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    const { data } = await nutritionApi.get<IMenuDraft[]>('/v1/menus/draft', { params });
    return data;
};

export const getDraftById = async (id: string): Promise<IMenuDraft> => {
    assertNutritionSubscriptionAccess();
    const { data } = await nutritionApi.get<IMenuDraft>(`/v1/menus/draft/${id}`);
    return data;
};


export const createMenu = async (menuData: Partial<IMenu>): Promise<IMenu> => {
    assertNutritionSubscriptionAccess();
    const { data } = await nutritionApi.post('/v1/menus', menuData);
    return data;
};

export const updateMenu = async (id: number, menuData: Partial<IMenu>): Promise<IMenu> => {
    assertNutritionSubscriptionAccess();
    const { data } = await nutritionApi.patch(`/v1/menus/${id}`, menuData);
    return data;
};

export const deleteMenu = async (id: number): Promise<void> => {
    assertNutritionSubscriptionAccess();
    await nutritionApi.delete(`/v1/menus/${id}`);
};

// Payload for swapping daily menu
export interface SwapDailyMenuPayload {
    client_id: number;
    date: string;
    new_menu_id: number;
}

export const swapDailyMenu = async (payload: SwapDailyMenuPayload): Promise<void> => {
    assertNutritionSubscriptionAccess();
    await nutritionApi.patch('/v1/menus/daily/swap', payload);
};

export const getMenuPoolSummary = async (
    professionalId: number,
    clientId?: number,
    date?: string,
): Promise<IMenuPoolSummary[]> => {
    assertNutritionSubscriptionAccess();
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    if (date) params.date = date;
    const { data } = await nutritionApi.get('/v1/menus/pool/summary', { params });
    return data;
};

export const getMenuPoolCalendarSummary = async (
    professionalId: number,
    clientId?: number,
    date?: string,
): Promise<IMenuCalendarSummary[]> => {
    assertNutritionSubscriptionAccess();
    const params: any = { professional_id: professionalId };
    if (clientId) params.client_id = clientId;
    if (date) params.date = date;
    const { data } = await nutritionApi.get('/v1/menus/pool/calendar/summary', { params });
    return data;
};

export const generateMenuAI = async (data: GenerateAiMenuDto): Promise<GenerateAiMenuResponse> => {
    assertNutritionSubscriptionAccess();
    // Increase timeout to 120 seconds (2 minutes) for AI generation
    const { data: response } = await nutritionApi.post<GenerateAiMenuResponse>('/v1/menus/ai-generate', data, { timeout: 120000 });
    return response;
};
