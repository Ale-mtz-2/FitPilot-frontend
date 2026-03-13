import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy, Plus, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MacroSummaryCard, type MacroStats } from '@/components/nutrition/MacroSummaryCard';
import { RecipeImageUploader } from '@/components/recipes/RecipeImageUploader';
import { RecipeIngredientPickerModal } from '@/components/recipes/RecipeIngredientPickerModal';
import { useProfessional } from '@/contexts/ProfessionalContext';
import type { FoodSearchResult } from '@/features/foods/types';
import {
    useCreateRecipe,
    useDeleteRecipeImage,
    useDuplicateRecipe,
    useRecipe,
    useUpdateRecipe,
    useUploadRecipeImage,
} from '@/features/recipes/queries';
import type {
    RecipeIngredient,
    RecipeNutritionSummary,
    RecipeUpsertInput,
} from '@/features/recipes/types';

type DraftIngredient = {
    clientId: string;
    foodId: number;
    servingUnitId: number | null;
    quantity: string;
    food: FoodSearchResult;
};

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

const buildDraftIngredient = (ingredient: RecipeIngredient): DraftIngredient | null => {
    if (!ingredient.food) {
        return null;
    }

    return {
        clientId: `ingredient-${ingredient.id}`,
        foodId: ingredient.food_id,
        servingUnitId: ingredient.serving_unit_id,
        quantity: String(ingredient.quantity),
        food: ingredient.food,
    };
};

const calculateDraftSummary = (ingredients: DraftIngredient[]) => {
    return ingredients.reduce(
        (accumulator, ingredient) => {
            const baseServingSize = toNumber(ingredient.food.base_serving_size);
            if (baseServingSize <= 0) {
                return accumulator;
            }

            const selectedUnit = ingredient.food.serving_units.find(
                (unit) => unit.id === ingredient.servingUnitId,
            );
            const rawQuantity = toNumber(ingredient.quantity);
            const effectiveQuantity = selectedUnit
                ? rawQuantity * toNumber(selectedUnit.gram_equivalent)
                : rawQuantity;
            const ratio = effectiveQuantity / baseServingSize;

            accumulator.calories_kcal += toNumber(ingredient.food.calories_kcal) * ratio;
            accumulator.protein_g += toNumber(ingredient.food.protein_g) * ratio;
            accumulator.carbs_g += toNumber(ingredient.food.carbs_g) * ratio;
            accumulator.fat_g += toNumber(ingredient.food.fat_g) * ratio;
            accumulator.fiber_g += toNumber(ingredient.food.fiber_g) * ratio;

            return accumulator;
        },
        {
            calories_kcal: 0,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            fiber_g: 0,
        },
    );
};

const buildClientIngredientId = (foodId: number) => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `${foodId}-${crypto.randomUUID()}`;
    }

    return `${foodId}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toMacroStats = (summary: RecipeNutritionSummary): MacroStats => ({
    calories: summary.calories_kcal,
    protein: summary.protein_g,
    carbs: summary.carbs_g,
    fat: summary.fat_g,
    fiber: summary.fiber_g,
});

export function NutritionRecipeEditorPage() {
    const navigate = useNavigate();
    const { recipeId } = useParams<{ recipeId: string }>();
    const parsedRecipeId = recipeId ? Number(recipeId) : undefined;
    const isEditing = Boolean(parsedRecipeId);

    const { professional, userData } = useProfessional();
    const professionalId = professional?.sub
        ? Number(professional.sub)
        : userData?.id
          ? Number(userData.id)
          : undefined;

    const { data: recipe, isLoading } = useRecipe(parsedRecipeId);
    const createRecipeMutation = useCreateRecipe();
    const updateRecipeMutation = useUpdateRecipe();
    const duplicateRecipeMutation = useDuplicateRecipe();
    const uploadRecipeImageMutation = useUploadRecipeImage();
    const deleteRecipeImageMutation = useDeleteRecipeImage();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [pendingImageBlob, setPendingImageBlob] = useState<Blob | null>(null);
    const [removeImageRequested, setRemoveImageRequested] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [hydratedRecipeId, setHydratedRecipeId] = useState<number | null>(null);

    useEffect(() => {
        if (!recipe || recipe.id === hydratedRecipeId) {
            return;
        }

        setName(recipe.name);
        setDescription(recipe.description ?? '');
        setIngredients(
            recipe.ingredients
                .map((ingredient) => buildDraftIngredient(ingredient))
                .filter((ingredient): ingredient is DraftIngredient => Boolean(ingredient)),
        );
        setImagePreviewUrl(recipe.image_url ?? null);
        setPendingImageBlob(null);
        setRemoveImageRequested(false);
        setHydratedRecipeId(recipe.id);
    }, [hydratedRecipeId, recipe]);

    const isTemplateReadonly = Boolean(recipe?.is_template);
    const isSaving =
        createRecipeMutation.isPending ||
        updateRecipeMutation.isPending ||
        uploadRecipeImageMutation.isPending ||
        deleteRecipeImageMutation.isPending ||
        duplicateRecipeMutation.isPending;

    const nutritionSummary = useMemo(() => calculateDraftSummary(ingredients), [ingredients]);

    const handleAddIngredient = (food: FoodSearchResult) => {
        setIngredients((currentIngredients) => [
            ...currentIngredients,
            {
                clientId: buildClientIngredientId(food.id),
                foodId: food.id,
                servingUnitId: null,
                quantity: String(toNumber(food.base_serving_size) || 100),
                food,
            },
        ]);
    };

    const handleIngredientChange = (
        clientId: string,
        updater: (ingredient: DraftIngredient) => DraftIngredient,
    ) => {
        setIngredients((currentIngredients) =>
            currentIngredients.map((ingredient) =>
                ingredient.clientId === clientId ? updater(ingredient) : ingredient,
            ),
        );
    };

    const handleRemoveIngredient = (clientId: string) => {
        setIngredients((currentIngredients) =>
            currentIngredients.filter((ingredient) => ingredient.clientId !== clientId),
        );
    };

    const buildPayload = (): RecipeUpsertInput => ({
        name: name.trim(),
        description: description.trim() || undefined,
        ingredients: ingredients.map((ingredient) => ({
            food_id: ingredient.foodId,
            serving_unit_id: ingredient.servingUnitId,
            quantity: toNumber(ingredient.quantity),
        })),
    });

    const validateForm = () => {
        if (!name.trim()) {
            return 'El nombre de la receta es obligatorio.';
        }

        if (ingredients.length === 0) {
            return 'Agrega al menos un ingrediente.';
        }

        const hasInvalidQuantity = ingredients.some((ingredient) => toNumber(ingredient.quantity) <= 0);
        if (hasInvalidQuantity) {
            return 'Todas las cantidades deben ser mayores a 0.';
        }

        return null;
    };

    const handleSave = async () => {
        const validationError = validateForm();
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);

        let savedRecipeId = parsedRecipeId;

        try {
            const payload = buildPayload();
            const savedRecipe = isEditing
                ? await updateRecipeMutation.mutateAsync({ id: parsedRecipeId!, data: payload })
                : await createRecipeMutation.mutateAsync(payload);

            savedRecipeId = savedRecipe.id;

            if (removeImageRequested && recipe?.image_url && !pendingImageBlob) {
                await deleteRecipeImageMutation.mutateAsync(savedRecipe.id);
            }

            if (pendingImageBlob) {
                await uploadRecipeImageMutation.mutateAsync({
                    id: savedRecipe.id,
                    imageBlob: pendingImageBlob,
                });
            }

            toast.success(isEditing ? 'Receta actualizada correctamente.' : 'Receta creada correctamente.');
            navigate('/nutrition/recipes');
        } catch (event: any) {
            const message = event?.response?.data?.message || event?.message || 'No se pudo guardar la receta.';
            toast.error(Array.isArray(message) ? message.join(', ') : message);

            if (!isEditing && savedRecipeId) {
                navigate(`/nutrition/recipes/${savedRecipeId}/edit`);
            }
        }
    };

    const handleDuplicateTemplate = async () => {
        if (!recipe) {
            return;
        }

        try {
            const duplicatedRecipe = await duplicateRecipeMutation.mutateAsync(recipe.id);
            toast.success('Plantilla duplicada correctamente.');
            navigate(`/nutrition/recipes/${duplicatedRecipe.id}/edit`);
        } catch (event: any) {
            toast.error(event?.response?.data?.message || event?.message || 'No se pudo duplicar la plantilla.');
        }
    };

    if (isEditing && isLoading) {
        return (
            <div className="mx-auto max-w-7xl p-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="h-[620px] animate-pulse rounded-[2rem] border border-gray-100 bg-gray-50" />
                    <div className="h-[620px] animate-pulse rounded-[2rem] border border-gray-100 bg-gray-50" />
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/nutrition/recipes')}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-nutrition-700"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver a recetas
                    </button>

                    <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900">
                        {isEditing ? 'Editar receta' : 'Nueva receta'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Define ingredientes, portada y macros estimados de la receta.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isTemplateReadonly}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-nutrition-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-nutrition-500/20 transition hover:bg-nutrition-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {isEditing ? 'Guardar cambios' : 'Crear receta'}
                </button>
            </div>

            {isTemplateReadonly ? (
                <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-amber-50 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-amber-900">Esta receta es una plantilla global</h2>
                        <p className="mt-1 text-sm text-amber-800">
                            Las plantillas son de solo lectura. Duplica esta receta para editar tu propia copia.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDuplicateTemplate}
                        disabled={duplicateRecipeMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Copy className="h-4 w-4" />
                        Duplicar plantilla
                    </button>
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-6">
                    <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-gray-900">Datos generales</h2>
                        <div className="mt-5 grid gap-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Nombre de la receta
                                </label>
                                <input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    disabled={isTemplateReadonly}
                                    placeholder="Ej. Bowl de avena con frutos rojos"
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:bg-white focus:ring-2 focus:ring-nutrition-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">
                                    Descripcion
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                    disabled={isTemplateReadonly}
                                    placeholder="Describe preparacion, contexto de uso o notas importantes..."
                                    rows={5}
                                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:bg-white focus:ring-2 focus:ring-nutrition-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Ingredientes</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    Construye la receta con alimentos existentes del catalogo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPickerOpen(true)}
                                disabled={isTemplateReadonly}
                                className="inline-flex items-center gap-2 rounded-2xl border border-nutrition-200 bg-nutrition-50 px-4 py-2 text-sm font-semibold text-nutrition-700 transition hover:bg-nutrition-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Agregar ingrediente
                            </button>
                        </div>

                        {ingredients.length > 0 ? (
                            <div className="mt-5 space-y-4">
                                {ingredients.map((ingredient) => (
                                    <div
                                        key={ingredient.clientId}
                                        className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {ingredient.food.name}
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    {ingredient.food.brand || 'Sin marca'} · Base:{' '}
                                                    {toNumber(ingredient.food.base_serving_size)}{' '}
                                                    {ingredient.food.base_unit ?? 'g'}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveIngredient(ingredient.clientId)}
                                                disabled={isTemplateReadonly}
                                                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Quitar
                                            </button>
                                        </div>

                                        <div className="mt-5 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                                            <div>
                                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Cantidad
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={ingredient.quantity}
                                                    onChange={(event) =>
                                                        handleIngredientChange(ingredient.clientId, (currentIngredient) => ({
                                                            ...currentIngredient,
                                                            quantity: event.target.value,
                                                        }))
                                                    }
                                                    disabled={isTemplateReadonly}
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:ring-2 focus:ring-nutrition-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Unidad
                                                </label>
                                                <select
                                                    value={ingredient.servingUnitId ?? ''}
                                                    onChange={(event) => {
                                                        const nextValue = event.target.value
                                                            ? Number(event.target.value)
                                                            : null;
                                                        handleIngredientChange(ingredient.clientId, (currentIngredient) => ({
                                                            ...currentIngredient,
                                                            servingUnitId: nextValue,
                                                            quantity: nextValue
                                                                ? '1'
                                                                : String(
                                                                      toNumber(
                                                                          currentIngredient.food.base_serving_size,
                                                                      ) || 100,
                                                                  ),
                                                        }));
                                                    }}
                                                    disabled={isTemplateReadonly}
                                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-nutrition-500 focus:ring-2 focus:ring-nutrition-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                                >
                                                    <option value="">
                                                        Base ({toNumber(ingredient.food.base_serving_size)}{' '}
                                                        {ingredient.food.base_unit ?? 'g'})
                                                    </option>
                                                    {ingredient.food.serving_units.map((unit) => (
                                                        <option key={unit.id} value={unit.id}>
                                                            {unit.unit_name} ({toNumber(unit.gram_equivalent)} g)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-5 rounded-3xl border border-dashed border-gray-200 bg-gray-50/70 px-6 py-10 text-center">
                                <p className="text-lg font-semibold text-gray-900">Aun no hay ingredientes</p>
                                <p className="mt-2 text-sm text-gray-500">
                                    Agrega alimentos del catalogo para construir la receta.
                                </p>
                            </div>
                        )}

                        {formError ? (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {formError}
                            </div>
                        ) : null}
                    </section>
                </div>

                <div className="space-y-6">
                    <div className="xl:sticky xl:top-6 xl:self-start">
                        <div className="space-y-6">
                            <RecipeImageUploader
                                imageUrl={imagePreviewUrl}
                                onChange={(blob, previewUrl) => {
                                    setImagePreviewUrl(previewUrl);
                                    setPendingImageBlob(blob);
                                    setRemoveImageRequested(false);
                                }}
                                onRemove={() => {
                                    setImagePreviewUrl(null);
                                    setPendingImageBlob(null);
                                    setRemoveImageRequested(Boolean(recipe?.image_url));
                                }}
                                disabled={isTemplateReadonly || isSaving}
                            />

                            <section className="rounded-[2.5rem] border border-gray-100 bg-white p-6 shadow-xl shadow-gray-200/40">
                                <MacroSummaryCard
                                    stats={toMacroStats(nutritionSummary)}
                                    title="Macros estimados calculados desde ingredientes"
                                    subtitle="Receta actual"
                                />

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Ingredientes
                                        </div>
                                        <div className="mt-1 text-lg font-bold text-gray-900">
                                            {ingredients.length}
                                        </div>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                            Estado
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-gray-900">
                                            {ingredients.length > 0 ? 'Actualizado en vivo' : 'Sin ingredientes'}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <RecipeIngredientPickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSelect={handleAddIngredient}
                professionalId={professionalId}
                excludeIds={ingredients.map((ingredient) => ingredient.foodId)}
            />
        </div>
    );
}
