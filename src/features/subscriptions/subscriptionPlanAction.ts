import type { Plan } from '@/features/plans/types';
import type { User } from '@/types/api';
import { resolveSubscriptionPlanAction } from './planAccess';
import type {
  CreateCheckoutSessionPayload,
  CreateCheckoutSessionResponse,
  CreatePortalSessionPayload,
  CreatePortalSessionResponse,
  ResumeSubscriptionResponse,
} from './types';

export const ACTIVE_SUBSCRIPTION_EXISTS_CODE = 'ACTIVE_SUBSCRIPTION_EXISTS';

export type SubscriptionPlanActionResult =
  | { kind: 'already_active' }
  | { kind: 'resume'; message?: string }
  | { kind: 'portal' }
  | { kind: 'checkout' };

type RunSubscriptionPlanActionOptions = {
  selectedPlan: Plan;
  fallbackUser: User | null;
  origin: string;
  refreshProfessional: (forceRefresh?: boolean) => Promise<void>;
  getLatestUser: () => User | null;
  resumeSubscription: () => Promise<ResumeSubscriptionResponse>;
  createPortalSession: (
    payload: CreatePortalSessionPayload,
  ) => Promise<CreatePortalSessionResponse>;
  createCheckoutSession: (
    payload: CreateCheckoutSessionPayload,
  ) => Promise<CreateCheckoutSessionResponse>;
  redirectTo: (url: string) => void;
};

export const getRedirectUrl = (payload: Record<string, unknown>): string | null => {
  const rawUrl = payload.url ?? payload.checkout_url ?? payload.session_url;
  if (typeof rawUrl === 'string' && rawUrl.trim()) {
    return rawUrl;
  }

  return null;
};

export const getApiErrorCode = (error: unknown): string | null => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'code' in error.response.data
  ) {
    const code = (error.response.data as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }

  return null;
};

export const getApiErrorMessage = (error: unknown): string | null => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object'
  ) {
    const responseData = error.response as {
      data?: {
        message?: string | string[];
        error?: string;
        detail?: string;
      };
    };

    if (Array.isArray(responseData.data?.message)) {
      return responseData.data.message.filter(Boolean).join(', ') || null;
    }

    return responseData.data?.message || responseData.data?.error || responseData.data?.detail || null;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return null;
};

export const runSubscriptionPlanAction = async ({
  selectedPlan,
  fallbackUser,
  origin,
  refreshProfessional,
  getLatestUser,
  resumeSubscription,
  createPortalSession,
  createCheckoutSession,
  redirectTo,
}: RunSubscriptionPlanActionOptions): Promise<SubscriptionPlanActionResult> => {
  await refreshProfessional(true);
  const latestUser = getLatestUser() ?? fallbackUser;
  const action = resolveSubscriptionPlanAction(selectedPlan, latestUser);

  if (action === 'already_active') {
    return { kind: 'already_active' };
  }

  if (action === 'resume') {
    const response = await resumeSubscription();
    return {
      kind: 'resume',
      message: response.message,
    };
  }

  if (action === 'portal') {
    const response = await createPortalSession({
      return_url: `${origin}/subscriptions/plans`,
    });
    const portalUrl = getRedirectUrl(response as Record<string, unknown>);

    if (!portalUrl) {
      throw new Error('No se recibio una URL valida del portal de Stripe.');
    }

    redirectTo(portalUrl);
    return { kind: 'portal' };
  }

  const response = await createCheckoutSession({
    plan_id: selectedPlan.id,
    billing_interval: 'monthly',
    success_url: `${origin}/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscriptions/cancel`,
  });
  const checkoutUrl = getRedirectUrl(response as Record<string, unknown>);

  if (!checkoutUrl) {
    throw new Error('No se recibio una URL de checkout valida.');
  }

  redirectTo(checkoutUrl);
  return { kind: 'checkout' };
};
