import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckIcon, StarIcon, BoltIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { SparklesIcon as SolidSparklesIcon } from '@heroicons/react/24/solid';
import { useProfessional } from '@/contexts/ProfessionalContext';
import {
  useCreateCheckoutSession,
  useCreatePortalSession,
  useResumeSubscription,
} from '@/features/subscriptions/queries';
import { usePlans } from '@/features/plans/queries';
import { Plan } from '@/features/plans/types';
import {
  resolvePlanAccess,
  resolveSubscriptionPlanAction,
  resolveSubscriptionState,
} from '@/features/subscriptions/planAccess';
import {
  ACTIVE_SUBSCRIPTION_EXISTS_CODE,
  getApiErrorCode,
  getApiErrorMessage,
  runSubscriptionPlanAction,
} from '@/features/subscriptions/subscriptionPlanAction';
import { useAuthStore } from '@/store/newAuthStore';
import type { User } from '@/types/api';

const formatPrice = (priceStr: string) => {
  const price = parseFloat(priceStr);
  if (isNaN(price)) return 'Precio no disponible';

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(price);
};

const getPlanMarketing = (plan: Plan) => {
  if (plan.name.includes('Starter')) {
    return {
      description: 'Ideal para iniciar tu emprendimiento profesional.',
      icon: <BoltIcon className="w-6 h-6 text-gray-400" />,
      features: [
        `Hasta ${plan.max_clients || '10'} clientes`,
        'Acceso a nutricion',
        'Acceso a entrenamiento',
        'Agenda y recordatorios',
        `${plan.trial_days} dias de prueba gratis`,
      ].filter(Boolean) as string[],
    };
  }
  if (plan.name.includes('Nutrition')) {
    return {
      description: 'Potencia tu consultorio nutricional al maximo.',
      icon: <SparklesIcon className="w-6 h-6 text-emerald-500" />,
      features: [
        'Pacientes ilimitados',
        'Creador de planes de alimentacion avanzado',
        'Base de datos de alimentos premium',
        'Seguimiento antropometrico detallado',
        `${plan.trial_days} dias de prueba gratis`,
      ],
    };
  }
  if (plan.name.includes('Training')) {
    return {
      description: 'Lleva el entrenamiento de tus clientes al siguiente nivel.',
      icon: <FireIcon className="w-6 h-6 text-orange-500" />,
      features: [
        'Clientes ilimitados',
        'Creador de rutinas y mesociclos',
        'Biblioteca de ejercicios en video',
        'Seguimiento de progreso y fatiga',
        `${plan.trial_days} dias de prueba gratis`,
      ],
    };
  }

  return {
    description: 'La experiencia completa para el profesional hibrido definitivo.',
    icon: <StarIcon className="w-6 h-6 text-indigo-500" />,
    features: [
      'Pacientes y clientes ilimitados',
      'Acceso total a modulo de Nutricion',
      'Acceso total a modulo de Entrenamiento',
      'Soporte prioritario 24/7',
      'Funciones exclusivas con IA',
      `${plan.trial_days} dias de prueba gratis`,
    ],
  };
};

const getPrimaryActionLabel = (plan: Plan | null, user: User | null): string => {
  const action = resolveSubscriptionPlanAction(plan, user);
  const subscription = resolveSubscriptionState(user);

  if (action === 'resume') return 'Reactivar renovacion automatica';
  if (action === 'portal') return 'Administrar cambio de plan';
  if (action === 'already_active') return 'Tu plan ya esta activo';
  if (subscription.status === 'expired') return 'Renovar plan';
  return `Comenzar prueba gratis de ${plan?.trial_days ?? 0} dias`;
};

const getStateBanner = (user: User | null): { tone: string; text: string } | null => {
  const subscription = resolveSubscriptionState(user);
  const access = resolvePlanAccess(user);

  if (subscription.status === 'scheduled_cancelation') {
    return {
      tone: 'bg-amber-50 border-amber-100 text-amber-800',
      text: `Tu plan ${access.currentPlanName ?? ''} sigue activo, pero terminara al cierre del periodo actual.`,
    };
  }

  if (subscription.status === 'expired') {
    return {
      tone: 'bg-slate-50 border-slate-200 text-slate-700',
      text: `Tu ultimo plan ${access.currentPlanName ?? ''} ya vencio. Puedes renovarlo o elegir otro.`,
    };
  }

  if (subscription.status === 'active') {
    return {
      tone: 'bg-emerald-50 border-emerald-100 text-emerald-800',
      text: `Tu plan ${access.currentPlanName ?? ''} esta activo. Si eliges otro plan, te enviaremos al portal de Stripe.`,
    };
  }

  return null;
};

export function SubscriptionPlansPage() {
  const { data: plans = [], isLoading, isError } = usePlans();
  const { userData, refreshProfessional } = useProfessional();
  const createCheckoutMutation = useCreateCheckoutSession();
  const createPortalSessionMutation = useCreatePortalSession();
  const resumeSubscriptionMutation = useResumeSubscription();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const banner = getStateBanner(userData);
  const isProcessing =
    createCheckoutMutation.isPending ||
    createPortalSessionMutation.isPending ||
    resumeSubscriptionMutation.isPending;

  const handlePlanAction = async () => {
    if (!selectedPlan) {
      toast.error('Selecciona un plan para continuar.');
      return;
    }

    try {
      const result = await runSubscriptionPlanAction({
        selectedPlan,
        fallbackUser: userData,
        origin: window.location.origin,
        refreshProfessional,
        getLatestUser: () => useAuthStore.getState().user ?? userData,
        resumeSubscription: () => resumeSubscriptionMutation.mutateAsync(),
        createPortalSession: (payload) => createPortalSessionMutation.mutateAsync(payload),
        createCheckoutSession: (payload) => createCheckoutMutation.mutateAsync(payload),
        redirectTo: (url) => window.location.assign(url),
      });

      if (result.kind === 'already_active') {
        toast.success('Tu plan ya esta activo.');
        return;
      }

      if (result.kind === 'resume') {
        await refreshProfessional(true);
        toast.success(result.message || 'La renovacion automatica fue reactivada.');
      }
    } catch (error) {
      console.error('Subscription action failed', error);

      if (getApiErrorCode(error) === ACTIVE_SUBSCRIPTION_EXISTS_CODE) {
        await refreshProfessional(true);
        toast('Actualizamos el estado de tu suscripcion. Intenta de nuevo.');
        return;
      }

      toast.error(
        getApiErrorMessage(error) || 'No se pudo completar la accion de suscripcion. Intenta de nuevo.'
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 px-4 sm:px-6 lg:px-8 pt-8">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Potencia tu practica hoy
        </h1>
        <p className="mt-4 text-xl text-gray-500">
          Elige el plan que mejor se adapte a tus necesidades. Cancela en cualquier momento.
        </p>
      </div>

      {banner && (
        <div className={`max-w-4xl mx-auto rounded-2xl border px-5 py-4 text-sm font-medium ${banner.tone}`}>
          {banner.text}
        </div>
      )}

      {isLoading && (
        <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-96 rounded-3xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="text-lg font-semibold">Ocurrio un error al cargar los planes.</p>
          <p className="mt-2 text-sm">Por favor verifica tu conexion o intenta recargar la pagina.</p>
        </div>
      )}

      {!isLoading && !isError && (
        <div
          className={`grid gap-8 lg:gap-6 items-center ${
            plans.length === 4 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'
          }`}
        >
          {plans.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const isUltimate = plan.name.toLowerCase().includes('ultimate');
            const marketing = getPlanMarketing(plan);

            return (
              <div
                key={plan.id}
                typeof="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`
                  relative flex flex-col rounded-3xl p-8 cursor-pointer transition-all duration-300 ease-in-out
                  ${
                    isUltimate
                      ? 'bg-gray-900 text-white ring-2 ring-indigo-500 shadow-2xl scale-105 z-10 lg:-mx-2'
                      : 'bg-white text-gray-900 ring-1 ring-gray-200 hover:shadow-xl hover:-translate-y-1'
                  }
                  ${isSelected && !isUltimate ? 'ring-2 ring-blue-500 shadow-xl' : ''}
                `}
              >
                {isUltimate && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1 text-sm font-semibold text-white shadow-sm">
                      <SolidSparklesIcon className="w-4 h-4" />
                      El mas popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className={`p-2 rounded-xl ${isUltimate ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    {marketing.icon}
                  </div>
                  {isSelected && (
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isUltimate ? 'bg-indigo-500 text-white' : 'bg-blue-600 text-white'
                      }`}
                    >
                      <CheckIcon className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <h3 className={`text-xl font-bold ${isUltimate ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>

                <p className={`mt-2 text-sm min-h-[40px] ${isUltimate ? 'text-gray-300' : 'text-gray-500'}`}>
                  {marketing.description}
                </p>

                <div className="mt-6 flex items-baseline text-5xl font-extrabold tracking-tight">
                  {formatPrice(plan.price_monthly)}
                  <span className={`ml-1 text-xl font-medium ${isUltimate ? 'text-gray-400' : 'text-gray-500'}`}>
                    /mes
                  </span>
                </div>

                <ul className="mt-8 space-y-4 flex-1">
                  {marketing.features.map((feature, index) => (
                    <li key={index} className="flex gap-3">
                      <CheckIcon className={`w-5 h-5 shrink-0 ${isUltimate ? 'text-indigo-400' : 'text-blue-500'}`} />
                      <span className={`text-sm ${isUltimate ? 'text-gray-300' : 'text-gray-600'}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlanId(plan.id);
                  }}
                  className={`mt-8 block w-full rounded-xl py-3 px-6 text-center text-sm font-semibold transition-colors
                    ${
                      isUltimate
                        ? isSelected
                          ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                          : 'bg-white/10 text-white hover:bg-white/20'
                        : isSelected
                          ? 'bg-blue-600 text-white hover:bg-blue-500'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }
                  `}
                >
                  {isSelected ? 'Plan seleccionado' : 'Seleccionar plan'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 z-50 ${
          selectedPlan ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-4xl mx-auto rounded-2xl bg-gray-900/95 backdrop-blur-md p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-800">
          <div className="flex flex-col">
            <span className="text-gray-400 text-sm font-medium">Plan seleccionado</span>
            <span className="text-white font-bold text-lg">
              {selectedPlan?.name} a {selectedPlan ? formatPrice(selectedPlan.price_monthly) : ''}/mes
            </span>
          </div>
          <button
            type="button"
            onClick={handlePlanAction}
            disabled={isProcessing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white text-gray-900 text-sm font-bold hover:bg-gray-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
          >
            {isProcessing ? 'Cargando...' : getPrimaryActionLabel(selectedPlan, userData)}
          </button>
        </div>
      </div>
    </div>
  );
}
