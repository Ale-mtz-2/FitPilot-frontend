export type InjuryStatus = 'active' | 'recovered' | 'chronic';

export interface GoalCatalogItem {
  id: number;
  code?: string;
  name: string;
  description?: string | null;
}

export interface AllergenCatalogItem {
  id: number;
  name: string;
  type?: string;
}

export interface ClientIntakeInjuryForm {
  name: string;
  body_part: string;
  severity: string;
  status: InjuryStatus;
  limitations: string;
  diagnosis_date: string;
}

export interface ClientIntakeFormState {
  date_of_birth: string;
  goal_ids: number[];
  allergen_ids: number[];
  weight_kg: string;
  height_cm: string;
  likes: string[];
  dislikes: string[];
  medical_conditions: string;
  notes: string;
  injuries: ClientIntakeInjuryForm[];
}

export interface OnboardingGoalPayload {
  id: number;
}

export interface OnboardingAllergenPayload {
  id: number;
}

export interface OnboardingMetricsPayload {
  weight_kg?: number;
  height_cm?: number;
}

export interface OnboardingPreferencesPayload {
  likes: string[];
  dislikes: string[];
}

export interface OnboardingInjuryPayload {
  name: string;
  body_part: string;
  severity?: number;
  status: InjuryStatus;
  limitations?: string;
  diagnosis_date?: string;
}

export interface ClientOnboardingPayload {
  user_id: number;
  date_of_birth: string;
  goals: OnboardingGoalPayload[];
  allergens: OnboardingAllergenPayload[];
  metrics?: OnboardingMetricsPayload;
  preferences: OnboardingPreferencesPayload;
  injuries: OnboardingInjuryPayload[];
  medical_conditions: string;
  notes: string;
}

export const createEmptyInjury = (): ClientIntakeInjuryForm => ({
  name: '',
  body_part: '',
  severity: '',
  status: 'active',
  limitations: '',
  diagnosis_date: '',
});

export const createDefaultClientIntakeFormState = (): ClientIntakeFormState => ({
  date_of_birth: '',
  goal_ids: [],
  allergen_ids: [],
  weight_kg: '',
  height_cm: '',
  likes: [],
  dislikes: [],
  medical_conditions: '',
  notes: '',
  injuries: [],
});
