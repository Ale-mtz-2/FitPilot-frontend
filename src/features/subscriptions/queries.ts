import { useMutation, useQuery } from '@tanstack/react-query';
import {
  cancelSubscription,
  createCheckoutSession,
  createPortalSession,
  getSubscriptionPlans,
  resumeSubscription,
} from './api';
import {
  CancelSubscriptionPayload,
  CreateCheckoutSessionPayload,
  CreatePortalSessionPayload,
} from './types';

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: getSubscriptionPlans,
  });
};

export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: (payload: CreateCheckoutSessionPayload) => createCheckoutSession(payload),
  });
};

export const useCancelSubscription = () => {
  return useMutation({
    mutationFn: (payload: CancelSubscriptionPayload) => cancelSubscription(payload),
  });
};

export const useCreatePortalSession = () => {
  return useMutation({
    mutationFn: (payload: CreatePortalSessionPayload) => createPortalSession(payload),
  });
};

export const useResumeSubscription = () => {
  return useMutation({
    mutationFn: () => resumeSubscription(),
  });
};
