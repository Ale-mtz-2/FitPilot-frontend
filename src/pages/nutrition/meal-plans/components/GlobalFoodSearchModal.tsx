import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Search } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { IExchangeGroup } from '@/features/exchange-groups/types';
import type { IFoodItem } from '@/features/foods/types';
import { filterMenuBuilderFoods } from '@/features/menus/menuBuilderSearch';

interface GlobalFoodSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (food: IFoodItem) => void;
    foods?: IFoodItem[];
    exchangeGroups?: IExchangeGroup[];
    isLoading: boolean;
}

const ALL_FILTER_VALUE = 'all';

export function GlobalFoodSearchModal({
    isOpen,
    onClose,
    onSelect,
    foods,
    exchangeGroups,
    isLoading,
}: GlobalFoodSearchModalProps) {
    const [query, setQuery] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState<string>(ALL_FILTER_VALUE);
    const [selectedSubgroupId, setSelectedSubgroupId] = useState<string>(ALL_FILTER_VALUE);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setQuery('');
        setSelectedGroupId(ALL_FILTER_VALUE);
        setSelectedSubgroupId(ALL_FILTER_VALUE);
    }, [isOpen]);

    const selectedGroup = useMemo(
        () => exchangeGroups?.find((group) => String(group.id) === selectedGroupId),
        [exchangeGroups, selectedGroupId],
    );

    const availableSubgroups = selectedGroup?.exchange_subgroups ?? [];

    useEffect(() => {
        if (!availableSubgroups.some((subgroup) => String(subgroup.id) === selectedSubgroupId)) {
            setSelectedSubgroupId(ALL_FILTER_VALUE);
        }
    }, [availableSubgroups, selectedSubgroupId]);

    const filteredFoods = useMemo(
        () =>
            filterMenuBuilderFoods(foods ?? [], {
                query,
                groupId: selectedGroupId === ALL_FILTER_VALUE ? null : Number(selectedGroupId),
                subgroupId: selectedSubgroupId === ALL_FILTER_VALUE ? null : Number(selectedSubgroupId),
            }),
        [foods, query, selectedGroupId, selectedSubgroupId],
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Buscar alimento" size="xl">
            <div className="flex h-[75vh] flex-col gap-5">
                <div className="grid gap-3 rounded-3xl border border-gray-200 bg-gray-50/70 p-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar por nombre o marca..."
                            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-12 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                            autoFocus
                        />
                    </div>

                    <select
                        value={selectedGroupId}
                        onChange={(event) => setSelectedGroupId(event.target.value)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value={ALL_FILTER_VALUE}>Todos los grupos</option>
                        {(exchangeGroups ?? []).map((group) => (
                            <option key={group.id} value={String(group.id)}>
                                {group.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedSubgroupId}
                        onChange={(event) => setSelectedSubgroupId(event.target.value)}
                        disabled={availableSubgroups.length === 0}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        <option value={ALL_FILTER_VALUE}>
                            {availableSubgroups.length > 0 ? 'Todos los subgrupos' : 'Sin subgrupos'}
                        </option>
                        {availableSubgroups.map((subgroup) => (
                            <option key={subgroup.id} value={String(subgroup.id)}>
                                {subgroup.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    <span>{filteredFoods.length} alimentos elegibles</span>
                    <span>Selecciona uno para agregarlo a la comida activa</span>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-44 animate-pulse rounded-3xl border border-gray-100 bg-gray-50"
                                />
                            ))}
                        </div>
                    ) : filteredFoods.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {filteredFoods.map((food) => (
                                <button
                                    key={food.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(food);
                                        onClose();
                                    }}
                                    className="group rounded-3xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <ChefHat className="h-6 w-6" />
                                        </div>
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            {food.base_serving_size} {food.base_unit ?? 'g'}
                                        </span>
                                    </div>

                                    <h3 className="line-clamp-2 text-base font-bold text-gray-900">{food.name}</h3>
                                    <p className="mt-1 min-h-[20px] text-sm text-gray-500">
                                        {food.brand || 'Sin marca'}
                                    </p>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {food.exchange_groups?.name ? (
                                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                                {food.exchange_groups.name}
                                            </span>
                                        ) : null}
                                        {food.exchange_subgroups?.name ? (
                                            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600">
                                                {food.exchange_subgroups.name}
                                            </span>
                                        ) : null}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 p-10 text-center">
                            <Search className="mb-4 h-12 w-12 text-gray-300" />
                            <h3 className="text-lg font-semibold text-gray-900">No se encontraron alimentos</h3>
                            <p className="mt-2 max-w-sm text-sm text-gray-500">
                                Ajusta la búsqueda o cambia el grupo y subgrupo seleccionados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
