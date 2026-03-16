import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { ChefHat, LoaderCircle, Plus, Search } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useGetFoods } from '@/features/foods/queries';
import type { FoodSearchResult, IFoodItem } from '@/features/foods/types';
import { matchesNormalizedQuery } from '@/utils/search';

interface RecipeIngredientPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (food: FoodSearchResult) => void;
    professionalId?: number;
    excludeIds?: number[];
}

const toNumber = (value: number | string | null | undefined) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
};

export function RecipeIngredientPickerModal({
    isOpen,
    onClose,
    onSelect,
    professionalId,
    excludeIds = [],
}: RecipeIngredientPickerModalProps) {
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [gridColumns, setGridColumns] = useState(1);
    const deferredQuery = useDeferredValue(query);
    const normalizedQuery = deferredQuery.trim();
    const { data, isLoading, isFetching } = useGetFoods(professionalId, isOpen && professionalId !== undefined);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const foodButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const foods = useMemo(() => {
        return (data ?? [])
            .filter((food) => !excludeIds.includes(food.id))
            .filter((food) => {
                if (!normalizedQuery) {
                    return true;
                }

                return matchesNormalizedQuery(`${food.name} ${food.brand ?? ''}`, normalizedQuery);
            })
            .slice(0, 18)
            .map((food): FoodSearchResult => ({
                id: food.id,
                name: food.name,
                brand: food.brand,
                exchange_group_id: food.exchange_group_id ?? null,
                base_serving_size: food.base_serving_size ?? null,
                base_unit: food.base_unit ?? null,
                calories_kcal: food.calories_kcal ?? null,
                protein_g: food.protein_g ?? null,
                carbs_g: food.carbs_g ?? null,
                fat_g: food.fat_g ?? null,
                fiber_g: food.fiber_g ?? null,
                serving_units: normalizeServingUnits(food),
            }));
    }, [data, excludeIds, normalizedQuery]);

    useEffect(() => {
        foodButtonRefs.current = foodButtonRefs.current.slice(0, foods.length);
    }, [foods.length]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setActiveIndex(0);
    }, [isOpen, normalizedQuery]);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const focusSearchInput = () => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        };

        const animationFrameId = window.requestAnimationFrame(focusSearchInput);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex((currentIndex) => {
            if (foods.length === 0) {
                return 0;
            }

            return Math.min(currentIndex, foods.length - 1);
        });
    }, [foods.length]);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') {
            return undefined;
        }

        const updateGridColumns = () => {
            if (window.innerWidth >= 1024) {
                setGridColumns(3);
                return;
            }

            if (window.innerWidth >= 768) {
                setGridColumns(2);
                return;
            }

            setGridColumns(1);
        };

        updateGridColumns();
        window.addEventListener('resize', updateGridColumns);
        return () => window.removeEventListener('resize', updateGridColumns);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || foods.length === 0) {
            return;
        }

        const activeButton = foodButtonRefs.current[activeIndex];
        if (activeButton) {
            activeButton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }, [activeIndex, foods.length, isOpen]);

    const moveActiveIndex = (nextIndex: number) => {
        if (foods.length === 0) {
            return;
        }

        setActiveIndex(Math.min(Math.max(nextIndex, 0), foods.length - 1));
    };

    const moveHorizontal = (offset: number) => {
        const nextIndex = activeIndex + offset;
        if (nextIndex < 0 || nextIndex >= foods.length) {
            return;
        }

        setActiveIndex(nextIndex);
    };

    const moveVertical = (offset: number) => {
        const nextIndex = activeIndex + offset;
        if (nextIndex < 0 || nextIndex >= foods.length) {
            return;
        }

        setActiveIndex(nextIndex);
    };

    const handleSelectFood = (food: FoodSearchResult) => {
        onSelect(food);
    };

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleWindowKeyDown = (event: KeyboardEvent) => {
            if (isLoading || foods.length === 0) {
                return;
            }

            if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) {
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                moveHorizontal(1);
                return;
            }

            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                moveHorizontal(-1);
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                moveVertical(gridColumns);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                moveVertical(-gridColumns);
                return;
            }

            if (event.key === 'Home') {
                event.preventDefault();
                moveActiveIndex(0);
                return;
            }

            if (event.key === 'End') {
                event.preventDefault();
                moveActiveIndex(foods.length - 1);
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                handleSelectFood(foods[activeIndex]);
            }
        };

        window.addEventListener('keydown', handleWindowKeyDown);
        return () => window.removeEventListener('keydown', handleWindowKeyDown);
    }, [activeIndex, foods, gridColumns, isLoading, isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Agregar ingrediente"
            size="xl"
            panelClassName="max-w-full sm:max-w-[60vw]"
        >
            <div className="flex h-[70vh] flex-col gap-5">
                <div className="rounded-3xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            ref={searchInputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Busca por nombre o marca..."
                            autoFocus
                            disabled={isLoading}
                            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:ring-2 focus:ring-nutrition-500/20"
                        />
                    </div>

                    {isLoading || isFetching ? (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-nutrition-200 bg-nutrition-50 px-3 py-2 text-xs font-semibold text-nutrition-700">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            {isLoading ? 'Cargando alimentos del catalogo...' : 'Actualizando alimentos...'}
                        </div>
                    ) : null}
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-3">
                    {isLoading ? (
                        <div className="space-y-4">
                            <div className="rounded-3xl border border-dashed border-nutrition-200 bg-nutrition-50/60 px-5 py-4 text-sm font-medium text-nutrition-800">
                                Estamos cargando los alimentos disponibles para que puedas agregarlos a la receta.
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div
                                        key={index}
                                        className="h-40 animate-pulse rounded-3xl border border-gray-100 bg-gray-50"
                                    />
                                ))}
                            </div>
                        </div>
                    ) : foods.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {foods.map((food, index) => (
                                <button
                                    key={food.id}
                                    type="button"
                                    ref={(element) => {
                                        foodButtonRefs.current[index] = element;
                                    }}
                                    onClick={() => handleSelectFood(food)}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onFocus={() => setActiveIndex(index)}
                                    aria-selected={activeIndex === index}
                                    className={`group rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none ${
                                        activeIndex === index
                                            ? 'border-nutrition-400 ring-2 ring-nutrition-500 ring-offset-2'
                                            : 'border-gray-100 hover:border-nutrition-200'
                                    }`}
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-nutrition-50 text-nutrition-600">
                                            <ChefHat className="h-6 w-6" />
                                        </div>
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            {toNumber(food.base_serving_size)} {food.base_unit ?? 'g'}
                                        </span>
                                    </div>

                                    <h3 className="line-clamp-2 text-base font-bold text-gray-900">{food.name}</h3>
                                    <p className="mt-1 min-h-[20px] text-sm text-gray-500">
                                        {food.brand || 'Sin marca'}
                                    </p>

                                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-medium text-gray-500">
                                        <div className="rounded-2xl bg-gray-50 px-3 py-2">
                                            {toNumber(food.calories_kcal)} kcal
                                        </div>
                                        <div className="rounded-2xl bg-gray-50 px-3 py-2">
                                            {food.serving_units.length} unidades
                                        </div>
                                    </div>

                                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-nutrition-600">
                                        <Plus className="h-4 w-4" />
                                        Agregar ingrediente
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
                            <ChefHat className="mb-4 h-12 w-12 text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-900">No se encontraron alimentos</h3>
                            <p className="mt-2 max-w-sm text-sm text-gray-500">
                                Prueba con otro nombre o marca para agregar ingredientes a la receta.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

const normalizeServingUnits = (food: IFoodItem): FoodSearchResult['serving_units'] =>
    Array.isArray(food.serving_units) ? food.serving_units : [];
