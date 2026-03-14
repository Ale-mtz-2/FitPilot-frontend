import { useQuery } from "@tanstack/react-query";
import { getFoods, getFoodsByExchangeGroup, searchFoods } from "./api";
import { FoodSearchResult, IFoodItem } from "./types";

/**
 * Hook to fetch foods by exchange group.
 */
export const useGetFoodsByExchangeGroup = (groupId?: number, professionalId?: number) => {
    return useQuery<IFoodItem[], Error>({
        queryKey: ["foods", "exchange-group", groupId, professionalId],
        queryFn: () => getFoodsByExchangeGroup(groupId!, professionalId),
        enabled: !!groupId,
    });
};

/**
 * Hook to fetch all foods.
 */
export const useGetFoods = (professionalId?: number, enabled = true) => {
    return useQuery<IFoodItem[], Error>({
        queryKey: ["foods", "all", professionalId],
        queryFn: () => getFoods(professionalId),
        enabled,
    });
};

export const useSearchFoods = (
    query: string,
    professionalId?: number,
    limit = 20,
    enabled = true,
) => {
    return useQuery<FoodSearchResult[], Error>({
        queryKey: ["foods", "search", query, professionalId, limit],
        queryFn: () => searchFoods(query, professionalId, limit),
        enabled,
        staleTime: 1000 * 30,
    });
};
