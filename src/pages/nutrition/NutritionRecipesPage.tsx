import { useDeferredValue, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    ChefHat,
    ChevronLeft,
    ChevronRight,
    Copy,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Modal } from '@/components/common/Modal';
import { useDeleteRecipe, useDuplicateRecipe, useRecipeCatalog } from '@/features/recipes/queries';
import {
    EMPTY_RECIPE_NUTRITION_SUMMARY,
    type RecipeListItem,
    type RecipeNutritionSummary,
    type RecipeScope,
} from '@/features/recipes/types';

const PAGE_SIZE = 9;

const scopeOptions: Array<{ value: RecipeScope; label: string }> = [
    { value: 'all', label: 'Todas' },
    { value: 'mine', label: 'Mis recetas' },
    { value: 'templates', label: 'Plantillas' },
];

const formatDate = (value: string) => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        return 'Sin fecha';
    }

    return parsedDate.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

const formatMacroValue = (value: number, suffix: string) => `${value.toFixed(1)}${suffix}`;
const getRecipeNutritionSummary = (recipe: RecipeListItem): RecipeNutritionSummary =>
    recipe.nutrition_summary ?? EMPTY_RECIPE_NUTRITION_SUMMARY;

function RecipeCard({
    recipe,
    onEdit,
    onDuplicate,
    onDelete,
    duplicateDisabled,
    deleteDisabled,
}: {
    recipe: RecipeListItem;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    duplicateDisabled: boolean;
    deleteDisabled: boolean;
}) {
    const isTemplate = recipe.is_template;
    const nutritionSummary = getRecipeNutritionSummary(recipe);

    return (
        <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition hover:shadow-xl hover:shadow-nutrition-500/10"
        >
            <div className="relative h-48 overflow-hidden bg-white">
                {recipe.image_url ? (
                    <img src={recipe.image_url} alt={recipe.name} className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/80 text-nutrition-600 shadow-sm">
                            <ChefHat className="h-9 w-9" />
                        </div>
                    </div>
                )}

                <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700 backdrop-blur">
                    {isTemplate ? 'Plantilla' : 'Mi receta'}
                </div>
            </div>

            <div className="space-y-5 p-6">
                <div>
                    <h3 className="line-clamp-2 text-xl font-black text-gray-900">{recipe.name}</h3>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                        {recipe.ingredient_count} ingrediente{recipe.ingredient_count === 1 ? '' : 's'} cargado
                        {recipe.ingredient_count === 1 ? '' : 's'}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Kcal</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                            {nutritionSummary.calories_kcal.toFixed(0)}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-red-400">Proteina</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                            {formatMacroValue(nutritionSummary.protein_g, 'g')}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-blue-400">Carbs</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                            {formatMacroValue(nutritionSummary.carbs_g, 'g')}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-orange-400">Grasas</div>
                        <div className="mt-1 text-lg font-bold text-gray-900">
                            {formatMacroValue(nutritionSummary.fat_g, 'g')}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3 text-sm">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Actualizada</div>
                        <div className="mt-1 font-semibold text-gray-900">{formatDate(recipe.updated_at)}</div>
                    </div>
                </div>

                <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                    {isTemplate ? (
                        <button
                            type="button"
                            onClick={onDuplicate}
                            disabled={duplicateDisabled}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-nutrition-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-nutrition-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Copy className="h-4 w-4" />
                            Duplicar
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-nutrition-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-nutrition-700"
                            >
                                <Pencil className="h-4 w-4" />
                                Editar
                            </button>
                            <button
                                type="button"
                                onClick={onDelete}
                                disabled={deleteDisabled}
                                className="inline-flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={`Eliminar ${recipe.name}`}
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </motion.article>
    );
}

export function NutritionRecipesPage() {
    const navigate = useNavigate();
    const [scope, setScope] = useState<RecipeScope>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const deferredSearch = useDeferredValue(searchTerm);
    const [currentPage, setCurrentPage] = useState(1);
    const [recipeToDelete, setRecipeToDelete] = useState<RecipeListItem | null>(null);

    const { data: recipes, isLoading, isError, error } = useRecipeCatalog(scope);
    const deleteRecipeMutation = useDeleteRecipe();
    const duplicateRecipeMutation = useDuplicateRecipe();

    const filteredRecipes = useMemo(() => {
        const query = deferredSearch.trim().toLowerCase();
        const items = recipes ?? [];

        if (!query) {
            return items;
        }

        return items.filter((recipe) =>
            `${recipe.name} ${recipe.description ?? ''}`.toLowerCase().includes(query),
        );
    }, [deferredSearch, recipes]);

    const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
    const paginatedRecipes = filteredRecipes.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
    );

    const handleDuplicate = async (recipeId: number) => {
        try {
            const duplicatedRecipe = await duplicateRecipeMutation.mutateAsync(recipeId);
            toast.success('Receta duplicada correctamente.');
            navigate(`/nutrition/recipes/${duplicatedRecipe.id}/edit`);
        } catch (event: any) {
            toast.error(event?.response?.data?.message || event?.message || 'No se pudo duplicar la receta.');
        }
    };

    const handleDelete = async () => {
        if (!recipeToDelete) {
            return;
        }

        try {
            await deleteRecipeMutation.mutateAsync(recipeToDelete.id);
            toast.success('Receta eliminada correctamente.');
            setRecipeToDelete(null);
        } catch (event: any) {
            toast.error(event?.response?.data?.message || event?.message || 'No se pudo eliminar la receta.');
        }
    };

    const handleScopeChange = (nextScope: RecipeScope) => {
        setScope(nextScope);
        setCurrentPage(1);
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-nutrition-50 px-4 py-2 text-sm font-semibold text-nutrition-700">
                        <ChefHat className="h-4 w-4" />
                        Biblioteca de recetas
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-900">Recetas de alimentos</h1>
                    <p className="mt-2 max-w-2xl text-gray-500">
                        Administra tus recetas y plantillas reutilizables con imagen, ingredientes y macros estimados.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/nutrition/recipes/new')}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-nutrition-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-nutrition-500/20 transition hover:bg-nutrition-700"
                >
                    <Plus className="h-4 w-4" />
                    Nueva receta
                </button>
            </div>

            <div className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative max-w-xl flex-1">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => {
                                setSearchTerm(event.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Buscar por nombre o descripcion..."
                            className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 py-3 pl-12 pr-4 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:bg-white focus:ring-2 focus:ring-nutrition-500/20"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {scopeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleScopeChange(option.value)}
                                className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                                    scope === option.value
                                        ? 'border-nutrition-600 bg-nutrition-600 text-white'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-nutrition-200 hover:text-nutrition-700'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <div key={index} className="h-[420px] animate-pulse rounded-[2rem] border border-gray-100 bg-gray-50" />
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-5 text-red-700">
                    No se pudieron cargar las recetas: {error?.message || 'Error desconocido'}.
                </div>
            ) : filteredRecipes.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {paginatedRecipes.map((recipe) => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onEdit={() => navigate(`/nutrition/recipes/${recipe.id}/edit`)}
                                onDuplicate={() => handleDuplicate(recipe.id)}
                                onDelete={() => setRecipeToDelete(recipe)}
                                duplicateDisabled={duplicateRecipeMutation.isPending}
                                deleteDisabled={deleteRecipeMutation.isPending}
                            />
                        ))}
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-gray-500">
                            Mostrando {(currentPage - 1) * PAGE_SIZE + 1} -{' '}
                            {Math.min(currentPage * PAGE_SIZE, filteredRecipes.length)} de {filteredRecipes.length}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>

                            <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
                                {currentPage} / {totalPages}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-[2rem] border border-dashed border-gray-200 bg-white px-8 py-16 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-nutrition-50 text-nutrition-600">
                        <ChefHat className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">No hay recetas en esta vista</h2>
                    <p className="mt-3 max-w-xl text-gray-500">
                        Crea tu primera receta o cambia el filtro para ver tus plantillas y recetas personales.
                    </p>
                </div>
            )}

            <Modal
                isOpen={Boolean(recipeToDelete)}
                onClose={() => setRecipeToDelete(null)}
                title="Eliminar receta"
                size="md"
            >
                <div className="space-y-6 pt-3">
                    <p className="text-sm text-gray-600">
                        Esta accion marcara como eliminada la receta{' '}
                        <span className="font-semibold text-gray-900">{recipeToDelete?.name}</span>.
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setRecipeToDelete(null)}
                            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteRecipeMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
