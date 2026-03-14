import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useClientHistory } from '@/features/client-history/queries';
import {
  useAllergenCatalog,
  useGoalCatalog,
  useSubmitClientIntake,
} from '@/features/client-intake/queries';
import {
  mapFormToOnboardingPayload,
  mapHistoryToIntakeForm,
  normalizePreferenceInput,
} from '@/features/client-intake/mappers';
import {
  createDefaultClientIntakeFormState,
  createEmptyInjury,
} from '@/features/client-intake/types';
import { getApiErrorMessage } from '@/utils/apiError';
import { matchesNormalizedQuery, normalizeSearchText } from '@/utils/search';

const INTAKE_STEPS = [
  { id: 'goals', label: 'Objetivos' },
  { id: 'allergens', label: 'Alergenos' },
  { id: 'personal', label: 'Datos personales' },
  { id: 'metrics', label: 'Metricas base' },
  { id: 'preferences', label: 'Preferencias' },
  { id: 'medical', label: 'Medico y notas' },
] as const;

const validateDateOfBirth = (dateOfBirth: string): string | null => {
  const normalized = dateOfBirth.trim();
  if (!normalized) {
    return 'La fecha de nacimiento es obligatoria.';
  }

  const parsedDate = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'La fecha de nacimiento no es valida.';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsedDate > today) {
    return 'La fecha de nacimiento no puede ser futura.';
  }

  return null;
};

export function NutritionClientIntakePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const numericClientId = Number(clientId);
  const isValidClientId = Number.isFinite(numericClientId) && numericClientId > 0;
  const returnTo = searchParams.get('returnTo');

  const [stepIndex, setStepIndex] = useState(0);
  const [goalsSearch, setGoalsSearch] = useState('');
  const [allergensSearch, setAllergensSearch] = useState('');
  const [likesInput, setLikesInput] = useState('');
  const [dislikesInput, setDislikesInput] = useState('');
  const [formState, setFormState] = useState(createDefaultClientIntakeFormState);
  const [formHydrated, setFormHydrated] = useState(false);

  const {
    data: clientHistory,
    isLoading: clientHistoryLoading,
    isError: isClientHistoryError,
    error: clientHistoryError,
  } = useClientHistory(isValidClientId ? numericClientId : undefined);
  const {
    data: goalsCatalog = [],
    isLoading: goalsLoading,
    isError: isGoalsError,
    error: goalsError,
  } = useGoalCatalog();
  const {
    data: allergensCatalog = [],
    isLoading: allergensLoading,
    isError: isAllergensError,
    error: allergensError,
  } = useAllergenCatalog();

  const submitClientIntake = useSubmitClientIntake();

  useEffect(() => {
    if (!clientHistory || formHydrated) return;

    setFormState(mapHistoryToIntakeForm(clientHistory));
    setFormHydrated(true);
  }, [clientHistory, formHydrated]);

  const clientLabel = useMemo(() => {
    if (!clientHistory) return `Cliente #${numericClientId}`;

    const fullName = [clientHistory.name, clientHistory.lastname]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || clientHistory.email || `Cliente #${numericClientId}`;
  }, [clientHistory, numericClientId]);

  const isOnboardingCompleted =
    clientHistory?.onboarding_status?.toLowerCase() === 'completed';

  const filteredGoals = useMemo(() => {
    const normalizedQuery = normalizeSearchText(goalsSearch);
    if (!normalizedQuery) return goalsCatalog;

    return goalsCatalog.filter((goal) =>
      matchesNormalizedQuery(goal.name, normalizedQuery),
    );
  }, [goalsCatalog, goalsSearch]);

  const filteredAllergens = useMemo(() => {
    const normalizedQuery = normalizeSearchText(allergensSearch);
    if (!normalizedQuery) return allergensCatalog;

    return allergensCatalog.filter((allergen) =>
      matchesNormalizedQuery(allergen.name, normalizedQuery),
    );
  }, [allergensCatalog, allergensSearch]);

  const isLoading = clientHistoryLoading || goalsLoading || allergensLoading;
  const loadError = clientHistoryError || goalsError || allergensError;
  const hasLoadError = isClientHistoryError || isGoalsError || isAllergensError;
  const isLastStep = stepIndex === INTAKE_STEPS.length - 1;
  const dateOfBirthError = useMemo(
    () => validateDateOfBirth(formState.date_of_birth),
    [formState.date_of_birth],
  );
  const stepValidationError = useMemo(() => {
    if (INTAKE_STEPS[stepIndex]?.id === 'personal') {
      return dateOfBirthError;
    }

    return null;
  }, [stepIndex, dateOfBirthError]);

  const toggleGoal = (goalId: number) => {
    setFormState((previous) => {
      const isSelected = previous.goal_ids.includes(goalId);
      return {
        ...previous,
        goal_ids: isSelected
          ? previous.goal_ids.filter((id) => id !== goalId)
          : [...previous.goal_ids, goalId],
      };
    });
  };

  const toggleAllergen = (allergenId: number) => {
    setFormState((previous) => {
      const isSelected = previous.allergen_ids.includes(allergenId);
      return {
        ...previous,
        allergen_ids: isSelected
          ? previous.allergen_ids.filter((id) => id !== allergenId)
          : [...previous.allergen_ids, allergenId],
      };
    });
  };

  const addPreference = (field: 'likes' | 'dislikes', value: string) => {
    const tokens = normalizePreferenceInput(value);
    if (tokens.length === 0) return;

    setFormState((previous) => {
      const merged = normalizePreferenceInput(
        [...previous[field], ...tokens].join(','),
      );

      return {
        ...previous,
        [field]: merged,
      };
    });
  };

  const removePreference = (field: 'likes' | 'dislikes', value: string) => {
    setFormState((previous) => ({
      ...previous,
      [field]: previous[field].filter((item) => item !== value),
    }));
  };

  const addInjury = () => {
    setFormState((previous) => ({
      ...previous,
      injuries: [...previous.injuries, createEmptyInjury()],
    }));
  };

  const updateInjuryField = (
    index: number,
    field: keyof (typeof formState)['injuries'][number],
    value: string,
  ) => {
    setFormState((previous) => ({
      ...previous,
      injuries: previous.injuries.map((injury, injuryIndex) =>
        injuryIndex === index ? { ...injury, [field]: value } : injury,
      ),
    }));
  };

  const removeInjury = (index: number) => {
    setFormState((previous) => ({
      ...previous,
      injuries: previous.injuries.filter((_, injuryIndex) => injuryIndex !== index),
    }));
  };

  const goBackToPreviousScreen = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }

    navigate('/nutrition/clients');
  };

  const handlePrimaryAction = async () => {
    if (!isLastStep && stepValidationError) {
      toast.error(stepValidationError);
      return;
    }

    if (!isLastStep) {
      setStepIndex((previous) => Math.min(previous + 1, INTAKE_STEPS.length - 1));
      return;
    }

    if (!isValidClientId) return;

    if (dateOfBirthError) {
      toast.error(dateOfBirthError);
      const personalStepIndex = INTAKE_STEPS.findIndex((step) => step.id === 'personal');
      if (personalStepIndex >= 0) {
        setStepIndex(personalStepIndex);
      }
      return;
    }

    try {
      const payload = mapFormToOnboardingPayload(numericClientId, formState);
      await submitClientIntake.mutateAsync(payload);
      toast.success('Intake guardado correctamente');

      if (returnTo) {
        navigate(returnTo, { replace: true });
        return;
      }

      navigate(`/nutrition/clients/${numericClientId}/medical-history`, {
        replace: true,
      });
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ||
          'No se pudo guardar el intake. Intenta nuevamente.',
      );
    }
  };

  if (!isValidClientId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          El identificador del cliente es invalido.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-nutrition-600" />
        </div>
      </div>
    );
  }

  if (hasLoadError) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          Error al cargar datos del intake: {loadError?.message || 'Error desconocido'}.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={goBackToPreviousScreen}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900">Intake de Onboarding</h1>
        <p className="text-sm text-gray-600 mt-1">
          Captura o actualiza la informacion inicial del cliente {clientLabel}.
        </p>

        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            isOnboardingCompleted
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {isOnboardingCompleted ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              Intake completado. Puedes editar esta informacion en cualquier momento.
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              El intake esta pendiente. Guardarlo evita huecos de informacion para
              consulta y generacion de planes.
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-2">
          {INTAKE_STEPS.map((step, index) => {
            const isActive = index === stepIndex;
            const isCompleted = index < stepIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (index <= stepIndex || !stepValidationError) {
                    setStepIndex(index);
                    return;
                  }
                  toast.error(stepValidationError);
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-nutrition-500 bg-nutrition-50 text-nutrition-700'
                    : isCompleted
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                {index + 1}. {step.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
        {stepIndex === 0 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Objetivos</h2>
            <Input
              placeholder="Buscar objetivos..."
              value={goalsSearch}
              onChange={(event) => setGoalsSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {filteredGoals.map((goal) => {
                const selected = formState.goal_ids.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-nutrition-600 border-nutrition-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {goal.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {stepIndex === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Alergenos e intolerancias</h2>
            <Input
              placeholder="Buscar alergenos..."
              value={allergensSearch}
              onChange={(event) => setAllergensSearch(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {filteredAllergens.map((allergen) => {
                const selected = formState.allergen_ids.includes(allergen.id);
                return (
                  <button
                    key={allergen.id}
                    type="button"
                    onClick={() => toggleAllergen(allergen.id)}
                    className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-nutrition-600 border-nutrition-600 text-white'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {allergen.name}
                    {allergen.type ? ` (${allergen.type})` : ''}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {stepIndex === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Datos personales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Fecha de nacimiento"
                value={formState.date_of_birth}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    date_of_birth: event.target.value,
                  }))
                }
              />
            </div>
            {dateOfBirthError && (
              <p className="text-sm text-red-600">{dateOfBirthError}</p>
            )}
          </section>
        )}

        {stepIndex === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Metricas base</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                step="0.1"
                label="Peso (kg)"
                value={formState.weight_kg}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    weight_kg: event.target.value,
                  }))
                }
              />
              <Input
                type="number"
                step="0.1"
                label="Altura (cm)"
                value={formState.height_cm}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    height_cm: event.target.value,
                  }))
                }
              />
            </div>
          </section>
        )}

        {stepIndex === 4 && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Preferencias</h2>
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Le gusta</label>
              <div className="flex gap-2">
                <Input
                  value={likesInput}
                  onChange={(event) => setLikesInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addPreference('likes', likesInput);
                    setLikesInput('');
                  }}
                  placeholder="Agrega uno o varios separados por coma"
                />
                <Button
                  type="button"
                  onClick={() => {
                    addPreference('likes', likesInput);
                    setLikesInput('');
                  }}
                >
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formState.likes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removePreference('likes', item)}
                    className="px-3 py-1 rounded-full border border-green-200 bg-green-50 text-green-800 text-sm"
                  >
                    {item} x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">No le gusta</label>
              <div className="flex gap-2">
                <Input
                  value={dislikesInput}
                  onChange={(event) => setDislikesInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    addPreference('dislikes', dislikesInput);
                    setDislikesInput('');
                  }}
                  placeholder="Agrega uno o varios separados por coma"
                />
                <Button
                  type="button"
                  onClick={() => {
                    addPreference('dislikes', dislikesInput);
                    setDislikesInput('');
                  }}
                >
                  Agregar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formState.dislikes.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => removePreference('dislikes', item)}
                    className="px-3 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700 text-sm"
                  >
                    {item} x
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {stepIndex === 5 && (
          <section className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Medico y notas</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Condiciones medicas
              </label>
              <textarea
                value={formState.medical_conditions}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    medical_conditions: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nutrition-500/30"
                placeholder="Ej. Hipertension, resistencia a la insulina, etc."
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Lesiones</label>
                <button
                  type="button"
                  onClick={addInjury}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar lesion
                </button>
              </div>

              <div className="space-y-4">
                {formState.injuries.length === 0 && (
                  <p className="text-sm text-gray-500">Sin lesiones registradas.</p>
                )}

                {formState.injuries.map((injury, index) => (
                  <div
                    key={`${index}-${injury.name}`}
                    className="rounded-xl border border-gray-200 p-4 space-y-3"
                  >
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeInjury(index)}
                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Nombre"
                        value={injury.name}
                        onChange={(event) =>
                          updateInjuryField(index, 'name', event.target.value)
                        }
                      />
                      <Input
                        label="Zona corporal"
                        value={injury.body_part}
                        onChange={(event) =>
                          updateInjuryField(index, 'body_part', event.target.value)
                        }
                      />
                      <Input
                        label="Severidad (1-5)"
                        type="number"
                        value={injury.severity}
                        onChange={(event) =>
                          updateInjuryField(index, 'severity', event.target.value)
                        }
                      />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                          Estado
                        </label>
                        <select
                          value={injury.status}
                          onChange={(event) =>
                            updateInjuryField(index, 'status', event.target.value)
                          }
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nutrition-500/30"
                        >
                          <option value="active">Activa</option>
                          <option value="recovered">Recuperada</option>
                          <option value="chronic">Cronica</option>
                        </select>
                      </div>
                      <Input
                        label="Fecha diagnostico"
                        type="date"
                        value={injury.diagnosis_date}
                        onChange={(event) =>
                          updateInjuryField(index, 'diagnosis_date', event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-sm font-semibold text-gray-700">
                        Limitaciones
                      </label>
                      <textarea
                        value={injury.limitations}
                        onChange={(event) =>
                          updateInjuryField(index, 'limitations', event.target.value)
                        }
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nutrition-500/30"
                        placeholder="Movimientos o ejercicios a evitar"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <textarea
                value={formState.notes}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-nutrition-500/30"
                placeholder="Notas relevantes para consulta y generacion de planes"
              />
            </div>
          </section>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setStepIndex((previous) => Math.max(0, previous - 1))}
          disabled={stepIndex === 0 || submitClientIntake.isPending}
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        <Button
          type="button"
          onClick={handlePrimaryAction}
          isLoading={submitClientIntake.isPending}
          disabled={Boolean(stepValidationError) || submitClientIntake.isPending}
        >
          {isLastStep ? 'Guardar intake' : 'Siguiente'}
          {!isLastStep && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

