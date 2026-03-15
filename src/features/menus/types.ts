import { IFoodItem } from '../foods/types';
import { IExchangeGroup } from '../exchange-groups/types';

export interface IMenu {
    id: number;
    meal_plan_id?: number | null;
    client_id: number;
    start_date: string;
    end_date: string;
    created_at: string;
    created_by: number | null;
    is_reusable: boolean;
    description_: string;
    title: string;
    menu_id_selected_client?: number;
    assigned_date?: string;
    assigned_start_date?: string;
    assigned_end_date?: string;
    alternate_menu_ids?: number[];
    menu_meals: IMenuMeal[];
}

export interface IMenuMeal {
    id: number;
    menu_id: number;
    name: string;
    source_meal_plan_meal_id?: number | null;
    // Mapping the complex key from the raw response
    menu_items_menu_items_menu_meal_idTomenu_meals: IMenuItem[];
}

export interface IMenuItem {
    id: number;
    menu_meal_id: number;
    exchange_group_id: number;
    food_id: number;
    serving_unit_id: number | null;
    quantity: number;
    recipe_id: number | null;
    recipe_summary?: {
        id: number;
        title: string;
        image_url: string | null;
    } | null;
    foods: IFoodItem;
    exchange_groups: IExchangeGroup;
    equivalent_quantity: number;
}

export interface IMenuPortionDetail {
    household_label: string | null;
    equivalents: number | null;
    grams: number | null;
}

export interface IMenuServingUnitSummary {
    id: number;
    unit_name: string | null;
    gram_equivalent: number | null;
    is_exchange_unit: boolean | null;
}

export interface IMenuFoodNutritionSummary {
    state?: string | null;
    calories_kcal?: number | null;
    glycemic_load?: number | null;
    base_serving_size?: number | null;
    base_unit?: string | null;
}

export interface IMenuDailyFood {
    id: number;
    name: string;
    base_serving_size?: number | null;
    base_unit?: string | null;
    serving_units?: IMenuServingUnitSummary[] | null;
    food_nutrition_values?: IMenuFoodNutritionSummary[] | null;
}

export interface IMenuDailyItem {
    id: number;
    menu_meal_id: number;
    exchange_group_id: number;
    food_id: number;
    serving_unit_id: number | null;
    quantity: number;
    recipe_id: number | null;
    recipe_summary?: {
        id: number;
        title: string;
        image_url: string | null;
    } | null;
    foods?: IMenuDailyFood | IFoodItem | null;
    exchange_groups?: IExchangeGroup | null;
    serving_units?: IMenuServingUnitSummary | null;
    portion_detail?: IMenuPortionDetail | null;
    equivalent_quantity: number;
}

export interface IMenuDailyMeal {
    id: number;
    menu_id: number;
    name: string;
    source_meal_plan_meal_id?: number | null;
    total_calories?: number | null;
    menu_items_menu_items_menu_meal_idTomenu_meals: IMenuDailyItem[];
}

export interface MenuDailyBatchResponseItem {
    id: number;
    client_id: number | null;
    created_by: number | null;
    is_reusable: boolean;
    title: string;
    description_: string;
    start_date?: string | null;
    end_date?: string | null;
    assigned_date?: string | null;
    menu_id_selected_client?: number | null;
    menu_meals: IMenuDailyMeal[];
}

export interface IMenuSummaryGroupPreview {
    id: number;
    name: string;
    color_code: string | null;
    equivalents: number;
}

export interface IMenuSummary {
    id: number;
    client_id: number | null;
    created_by: number | null;
    is_reusable: boolean;
    title: string;
    description_: string;
    created_at: string;
    start_date?: string | null;
    end_date?: string | null;
    assigned_date?: string | null;
    assignment_start_date?: string | null;
    assignment_end_date?: string | null;
    menu_id_selected_client?: number | null;
    meal_count: number;
    meal_names: string[];
    total_calories: number;
    total_equivalents: number;
    groups_preview: IMenuSummaryGroupPreview[];
}

export interface IReusableMenuSummary extends IMenuSummary {}

export interface IMenuPoolSummary extends IMenuSummary {}

export interface IMenuCalendarSummary extends IMenuSummary {}

export interface SaveMenuDraftDto {
    professional_id: number;
    client_id: number | null;
    json_data: any;
    is_ai_generated?: boolean;
}

export interface IMenuDraft {
    id: string; // UUID
    professional: number;
    client_id: string | number | null; // DB view says (Null), ID might be int or uuid? User screenshot shows client_id (Null).
    // Usually client_id is int. But let's allow string just in case.
    json_data: any;
    last_autosave: string; // datetime
    is_ai_generated: boolean;
    status: string;
    applied_at: string | null;
}

export interface DietPdfPortion {
    householdLabel: string | null;
    equivalents: number | null;
    grams: number | null;
}

export interface DietPdfIngredient {
    id: string;
    label: string;
    exchangeGroupName: string | null;
    portion: DietPdfPortion;
}

export interface DietPdfRecipe {
    id: string;
    recipeId: number | null;
    title: string;
    imageUrl: string | null;
    ingredientCount: number;
    ingredients: DietPdfIngredient[];
}

export interface DietPdfMeal {
    id: string;
    name: string;
    totalCalories: number | null;
    recipes: DietPdfRecipe[];
    standaloneFoods: DietPdfIngredient[];
}

export interface DietPdfDay {
    id: string;
    title: string;
    subtitle: string | null;
    dateKey: string | null;
    meals: DietPdfMeal[];
}

export interface DietPdfSummary {
    totalDays: number;
    totalMeals: number;
    totalRecipes: number;
    totalStandaloneFoods: number;
    totalCalories: number | null;
}

export interface DietPdfDocument {
    title: string;
    subtitle: string | null;
    clientName: string | null;
    periodLabel: string | null;
    printedAt: string;
    source: 'weekly' | 'editor';
    summary: DietPdfSummary;
    days: DietPdfDay[];
}



export interface GenerateAiMenuDto {
    client_id: number;
    extra_notes?: string;
    language?: string;
    data_system?: string;
    model?: string;
}

export interface GenerateAiMenuItem {
    exchange_group_id: number | null;
    food_id: number | null;
    quantity: number;
    equivalent_quantity: number;
    food_name?: string;
}

export interface GenerateAiMenuMeal {
    name: string;
    menu_items: GenerateAiMenuItem[];
}

export interface GenerateAiMenuResponse {
    client_id: number;
    start_date: string;
    end_date: string;
    menu_meals: GenerateAiMenuMeal[];
}

export interface AiHydrationWarning {
    meal_name: string;
    exchange_group_id?: number;
    food_id?: number;
    reason: 'missing_food' | 'missing_exchange_group';
    message: string;
}

export interface MenuBuilderFoodSelection {
    foodId?: number;
    grams: number;
    calculatedExchanges: number;
    nutritionValueId?: number;
    _foodRef?: IFoodItem;
    recipeId?: number;
    recipeName?: string;
    recipeImageUrl?: string | null;
    isFromRecipe?: boolean;
    shouldAutoOpen?: boolean;
}

export interface IMenuExchangeDraft {
    id?: number;
    exchange_group_id: number;
    quantity: number;
    meal_plan_meal_id?: number;
    updated_at?: string;
    deleted_at?: string | null;
    exchange_group?: IExchangeGroup;
}

export interface IMenuMealDraft {
    id?: number;
    meal_name?: string;
    sort_order?: number;
    meal_plan_exchanges?: IMenuExchangeDraft[];
    updated_at?: string;
    deleted_at?: string | null;
}
