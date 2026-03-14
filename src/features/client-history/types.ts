export interface IHistoryClient {
  id: number;
  name: string;
  email: string;
  date_of_birth?: string | null;
  onboarding_status?: string | null;
  onboarding_completed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  role: string;
  phone_number: string;
  profile_picture: string | null;
  deleted_at: string | null;
  lastname: string;
  username: string;
  is_phone_verified: boolean;
  genre?: string;
  client_allergens: ClientAllergen[];
  client_goals: ClientGoal[];
  client_records: ClientRecord[];
  daily_targets: DailyTarget[];
  client_metrics: ClientMetricHistory[];
  client_metrics_pagination?: ClientMetricsPagination;
  client_health_metrics: ClientHealthMetric[];
  client_injuries?: ClientInjury[];
  appointments: Appointment[];
}

export interface ClientMetricsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ClientHealthMetric {
  id: number;
  user_id: number;
  recorded_at: string;
  glucose_mg_dl: number | null;
  glucose_context: string | null;
  systolic_mmhg: number | null;
  diastolic_mmhg: number | null;
  heart_rate_bpm: number | null;
  oxygen_saturation_pct: string | null;
  notes: string | null;
}

export interface ClientAllergen {
  client_id: number;
  allergen_id: number;
  allergens: {
    id: number;
    name: string;
    type: string;
    created_at: string;
  };
}

export interface ClientInjury {
  id: number;
  user_id: number;
  name: string;
  body_part: string;
  severity: number | null;
  status: string;
  limitations: string | null;
  diagnosis_date: string | null;
  recovery_date: string | null;
  created_at: string;
}

export interface ClientGoal {
  id: number;
  client_id: number;
  goal_id: number;
  is_primary: boolean;
  created_at: string;
  goals: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    created_at: string;
    adjustment_type?: string;
    adjustment_value?: number;
    protein_ratio?: string;
    carbs_ratio?: string;
    fat_ratio?: string;
  };
}

export interface ClientRecord {
  id: number;
  client_id: number;
  medical_conditions: string;
  notes: string;
  preferences: {
    likes: string[];
    dislikes: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface DailyTarget {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  is_active: boolean;
}

export interface ClientMetricHistory {
  id: string;
  user_id: number;
  date: string;
  logged_at: string;
  weight_kg: string;
  height_cm: string;
  body_fat_pct: string;
  upper_body_fat_pct?: string | null;
  lower_body_fat_pct?: string | null;
  fat_free_mass_kg?: string | null;
  muscle_mass_kg: string;
  bone_mass_kg?: string | null;
  metabolic_age?: number | null;
  visceral_fat?: string | null;
  water_pct?: string | null;
  waist_cm?: string | null;
  hip_cm?: string | null;
  chest_cm?: string | null;
  cephalic_cm?: string | null;
  neck_cm?: string | null;
  relaxed_arm_midpoint_cm?: string | null;
  contracted_arm_midpoint_cm?: string | null;
  forearm_cm?: string | null;
  wrist_cm?: string | null;
  mesosternal_cm?: string | null;
  umbilical_cm?: string | null;
  biacromial_cm?: string | null;
  biiliocrestal_cm?: string | null;
  foot_length_cm?: string | null;
  thorax_transverse_cm?: string | null;
  thorax_anteroposterior_cm?: string | null;
  humerus_biepicondylar_cm?: string | null;
  wrist_bistyloid_cm?: string | null;
  femur_biepicondylar_cm?: string | null;
  bimaleolar_cm?: string | null;
  foot_transverse_cm?: string | null;
  hand_length_cm?: string | null;
  hand_transverse_cm?: string | null;
  arm_left_cm?: string | null;
  arm_right_cm?: string | null;
  mid_thigh_cm?: string | null;
  calf_cm?: string | null;
  thigh_left_cm?: string | null;
  thigh_right_cm?: string | null;
  calf_left_cm?: string | null;
  calf_right_cm?: string | null;
  subscapular_fold_mm?: string | null;
  triceps_fold_mm?: string | null;
  biceps_fold_mm?: string | null;
  iliac_crest_fold_mm?: string | null;
  supraspinal_fold_mm?: string | null;
  abdominal_fold_mm?: string | null;
  front_thigh_fold_mm?: string | null;
  medial_calf_fold_mm?: string | null;
  mid_axillary_fold_mm?: string | null;
  pectoral_fold_mm?: string | null;
  notes?: string;
  recorded_by_user_id?: number | null;
  appointment_id?: number | null;
}

export interface MeasurementMutationPayload {
  weight_kg?: number | null;
  height_cm?: number | null;
  body_fat_pct?: number | null;
  upper_body_fat_pct?: number | null;
  lower_body_fat_pct?: number | null;
  fat_free_mass_kg?: number | null;
  muscle_mass_kg?: number | null;
  bone_mass_kg?: number | null;
  metabolic_age?: number | null;
  visceral_fat?: number | null;
  water_pct?: number | null;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  cephalic_cm?: number | null;
  neck_cm?: number | null;
  relaxed_arm_midpoint_cm?: number | null;
  contracted_arm_midpoint_cm?: number | null;
  forearm_cm?: number | null;
  wrist_cm?: number | null;
  mesosternal_cm?: number | null;
  umbilical_cm?: number | null;
  biacromial_cm?: number | null;
  biiliocrestal_cm?: number | null;
  foot_length_cm?: number | null;
  thorax_transverse_cm?: number | null;
  thorax_anteroposterior_cm?: number | null;
  humerus_biepicondylar_cm?: number | null;
  wrist_bistyloid_cm?: number | null;
  femur_biepicondylar_cm?: number | null;
  bimaleolar_cm?: number | null;
  foot_transverse_cm?: number | null;
  hand_length_cm?: number | null;
  hand_transverse_cm?: number | null;
  arm_left_cm?: number | null;
  arm_right_cm?: number | null;
  mid_thigh_cm?: number | null;
  calf_cm?: number | null;
  thigh_left_cm?: number | null;
  thigh_right_cm?: number | null;
  calf_left_cm?: number | null;
  calf_right_cm?: number | null;
  subscapular_fold_mm?: number | null;
  triceps_fold_mm?: number | null;
  biceps_fold_mm?: number | null;
  iliac_crest_fold_mm?: number | null;
  supraspinal_fold_mm?: number | null;
  abdominal_fold_mm?: number | null;
  front_thigh_fold_mm?: number | null;
  medial_calf_fold_mm?: number | null;
  mid_axillary_fold_mm?: number | null;
  pectoral_fold_mm?: number | null;
}

export interface CreateMeasurementPayload extends MeasurementMutationPayload {
  user_id: number;
}

export type MeasurementCalculationStatus = "computed" | "skipped" | "error";

export interface MeasurementCalculationValue {
  value: number | null;
  unit: string | null;
  method: string;
  formulaVersion: string;
  status: MeasurementCalculationStatus;
  details?: Record<string, unknown> | null;
}

export interface MeasurementCalculationWarning {
  code: string;
  calculation: string;
  message: string;
  missingFields?: string[];
}

export interface MeasurementCalculationRun {
  id: string;
  engineVersion: string;
  status: "completed" | "partial" | "failed" | "running";
  startedAt: string;
  finishedAt: string | null;
}

export interface MeasurementChartEntry {
  key: string;
  label: string;
  kind: "patient" | "theoretical";
  value: number;
  deltaFromPatient: number | null;
}

export interface MeasurementIdealWeightComparisonChart {
  chartType: "horizontal_bar";
  unit: "kg";
  patientWeight: number | null;
  theoreticalWeightAverage: number | null;
  theoreticalWeightRange: {
    min: number;
    max: number;
  } | null;
  entries: MeasurementChartEntry[];
}

export interface MeasurementCharts {
  idealWeightComparison: MeasurementIdealWeightComparisonChart | null;
}

export interface MeasurementDetailResponse {
  measurement: ClientMetricHistory;
  calculations: Record<string, MeasurementCalculationValue>;
  warnings: MeasurementCalculationWarning[];
  missingFieldsByCalculation: Record<string, string[]>;
  charts: MeasurementCharts;
  calculationRun: MeasurementCalculationRun | null;
}

export interface Appointment {
  id: number;
  professional_id: number;
  client_id: number;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  title: string | null;
  meeting_link: string | null;
  notes: string | null;
  deleted_at: string | null;
  start_date: string | null;
  end_date: string | null;
  effective_duration: string | null;
  is_intake: boolean;
}
