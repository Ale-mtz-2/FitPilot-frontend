import type { IHistoryClient } from '@/features/client-history/types';
import type {
  ClientIntakeFormState,
  ClientOnboardingPayload,
  InjuryStatus,
} from './types';
import { createDefaultClientIntakeFormState } from './types';

const uniqueNumberArray = (values: number[]): number[] =>
  Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));

const normalizeTextArray = (values: string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;

    seen.add(key);
    normalized.push(trimmed);
  });

  return normalized;
};

const parseOptionalNumber = (rawValue: string): number | undefined => {
  const normalized = rawValue.trim().replace(',', '.');
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDateInput = (rawValue: string | null | undefined): string => {
  if (!rawValue) return '';
  const trimmed = rawValue.trim();
  if (!trimmed) return '';
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
};

const resolveInjuryStatus = (status: string | null | undefined): InjuryStatus => {
  if (status === 'active' || status === 'recovered' || status === 'chronic') {
    return status;
  }

  return 'active';
};

const getLatestMetric = (history: IHistoryClient | null | undefined) => {
  const metrics = history?.client_metrics ?? [];
  if (metrics.length === 0) return null;

  return [...metrics].sort((a, b) => {
    const loggedDiff =
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime();
    if (loggedDiff !== 0) return loggedDiff;

    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;

    return Number(b.id) - Number(a.id);
  })[0];
};

export const mapHistoryToIntakeForm = (
  history: IHistoryClient | null | undefined,
): ClientIntakeFormState => {
  const initial = createDefaultClientIntakeFormState();
  if (!history) return initial;

  const latestMetric = getLatestMetric(history);
  const record = history.client_records?.[0];
  const likes = Array.isArray(record?.preferences?.likes)
    ? record.preferences.likes
    : [];
  const dislikes = Array.isArray(record?.preferences?.dislikes)
    ? record.preferences.dislikes
    : [];

  return {
    ...initial,
    date_of_birth: normalizeDateInput(history.date_of_birth),
    goal_ids: uniqueNumberArray((history.client_goals ?? []).map((goal) => goal.goal_id)),
    allergen_ids: uniqueNumberArray(
      (history.client_allergens ?? []).map((allergen) => allergen.allergen_id),
    ),
    weight_kg: latestMetric?.weight_kg?.toString() ?? '',
    height_cm: latestMetric?.height_cm?.toString() ?? '',
    likes: normalizeTextArray(likes),
    dislikes: normalizeTextArray(dislikes),
    medical_conditions: record?.medical_conditions ?? '',
    notes: record?.notes ?? '',
    injuries: (history.client_injuries ?? []).map((injury) => ({
      name: injury.name ?? '',
      body_part: injury.body_part ?? '',
      severity:
        injury.severity === null || injury.severity === undefined
          ? ''
          : String(injury.severity),
      status: resolveInjuryStatus(injury.status),
      limitations: injury.limitations ?? '',
      diagnosis_date: injury.diagnosis_date
        ? injury.diagnosis_date.slice(0, 10)
        : '',
    })),
  };
};

export const mapFormToOnboardingPayload = (
  userId: number,
  form: ClientIntakeFormState,
): ClientOnboardingPayload => {
  const weight = parseOptionalNumber(form.weight_kg);
  const height = parseOptionalNumber(form.height_cm);

  const metrics =
    weight !== undefined || height !== undefined
      ? {
          ...(weight !== undefined ? { weight_kg: weight } : {}),
          ...(height !== undefined ? { height_cm: height } : {}),
        }
      : undefined;

  const injuries = form.injuries
    .map((injury) => {
      const severity = parseOptionalNumber(injury.severity);
      const name = injury.name.trim();
      const bodyPart = injury.body_part.trim();
      const limitations = injury.limitations.trim();
      const diagnosisDate = injury.diagnosis_date.trim();

      if (!name && !bodyPart && !limitations && !diagnosisDate) {
        return null;
      }

      return {
        name,
        body_part: bodyPart,
        status: resolveInjuryStatus(injury.status),
        ...(severity !== undefined ? { severity } : {}),
        ...(limitations ? { limitations } : {}),
        ...(diagnosisDate ? { diagnosis_date: diagnosisDate } : {}),
      };
    })
    .filter((injury): injury is NonNullable<typeof injury> => injury !== null);

  return {
    user_id: userId,
    date_of_birth: normalizeDateInput(form.date_of_birth),
    goals: uniqueNumberArray(form.goal_ids).map((id) => ({ id })),
    allergens: uniqueNumberArray(form.allergen_ids).map((id) => ({ id })),
    ...(metrics ? { metrics } : {}),
    preferences: {
      likes: normalizeTextArray(form.likes),
      dislikes: normalizeTextArray(form.dislikes),
    },
    injuries,
    medical_conditions: form.medical_conditions.trim(),
    notes: form.notes.trim(),
  };
};

export const normalizePreferenceInput = (value: string): string[] =>
  normalizeTextArray(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

