import { describe, expect, it, vi } from 'vitest';
import type { Plan } from '@/features/plans/types';
import type { User } from '@/types/api';
import { runSubscriptionPlanAction } from './subscriptionPlanAction';

const buildPlan = (): Plan => ({
  id: 4,
  name: 'FitPilot Ultimate',
  price_monthly: '899',
  trial_days: 7,
  access_nutrition: true,
  access_training: true,
  is_active: true,
  max_clients: null,
  stripe_product_id: 'prod_ultimate',
  stripe_price_id: 'price_ultimate',
  stripe_price_id_monthly: 'price_ultimate_monthly',
  stripe_price_id_yearly: 'price_ultimate_yearly',
});

const buildExpiredUser = (): User => ({
  id: 12,
  email: 'pro@fitpilot.fit',
  role: 'PROFESSIONAL',
  has_active_subscription: false,
  current_subscription: {
    plan_id: 4,
    name: 'FitPilot Ultimate',
    cancel_at_period_end: false,
    ended_at: '2026-03-14T16:46:34.000Z',
  },
});

describe('runSubscriptionPlanAction', () => {
  it('creates a checkout session and redirects when the selected plan is expired', async () => {
    const refreshProfessional = vi.fn().mockResolvedValue(undefined);
    const createCheckoutSession = vi.fn().mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.test/cs_test_123',
    });
    const createPortalSession = vi.fn();
    const resumeSubscription = vi.fn();
    const redirectTo = vi.fn();

    const result = await runSubscriptionPlanAction({
      selectedPlan: buildPlan(),
      fallbackUser: buildExpiredUser(),
      origin: 'https://app.fitpilot.fit',
      refreshProfessional,
      getLatestUser: () => buildExpiredUser(),
      resumeSubscription,
      createPortalSession,
      createCheckoutSession,
      redirectTo,
    });

    expect(result).toEqual({ kind: 'checkout' });
    expect(refreshProfessional).toHaveBeenCalledWith(true);
    expect(createCheckoutSession).toHaveBeenCalledWith({
      plan_id: 4,
      billing_interval: 'monthly',
      success_url:
        'https://app.fitpilot.fit/subscriptions/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://app.fitpilot.fit/subscriptions/cancel',
    });
    expect(redirectTo).toHaveBeenCalledWith('https://checkout.stripe.test/cs_test_123');
    expect(createPortalSession).not.toHaveBeenCalled();
    expect(resumeSubscription).not.toHaveBeenCalled();
  });
});
