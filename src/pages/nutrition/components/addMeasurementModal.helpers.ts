import type {
  ClientMetricHistory,
  MeasurementMutationPayload,
} from "@/features/client-history/types";

export const DEFAULT_PERIMETERS = {
  waist_cm: "",
  hip_cm: "",
  chest_cm: "",
  cephalic_cm: "",
  neck_cm: "",
  mesosternal_cm: "",
  umbilical_cm: "",
  arm_left_cm: "",
  arm_right_cm: "",
  relaxed_arm_midpoint_cm: "",
  contracted_arm_midpoint_cm: "",
  forearm_cm: "",
  wrist_cm: "",
  thigh_left_cm: "",
  thigh_right_cm: "",
  mid_thigh_cm: "",
  calf_cm: "",
  calf_left_cm: "",
  calf_right_cm: "",
} as const;

export const DEFAULT_DIAMETERS = {
  biacromial_cm: "",
  biiliocrestal_cm: "",
  foot_length_cm: "",
  thorax_transverse_cm: "",
  thorax_anteroposterior_cm: "",
  humerus_biepicondylar_cm: "",
  wrist_bistyloid_cm: "",
  femur_biepicondylar_cm: "",
  bimaleolar_cm: "",
  foot_transverse_cm: "",
  hand_length_cm: "",
  hand_transverse_cm: "",
} as const;

export type PerimeterField = keyof typeof DEFAULT_PERIMETERS;
export type DiameterField = keyof typeof DEFAULT_DIAMETERS;
export type CompositionModalVariant = "create" | "edit";

export interface CompositionFormValues {
  peso: string;
  estatura: string;
  fatPercentage: string;
  upperBodyFatPercentage: string;
  lowerBodyFatPercentage: string;
  visceralFatRating: string;
  fatFreeMassKg: string;
  muscleMassKg: string;
  boneMassKg: string;
  bodyWaterPercentage: string;
  metabolicAge: string;
  subscapularFoldMm: string;
  tricepsFoldMm: string;
  bicepsFoldMm: string;
  iliacCrestFoldMm: string;
  supraspinalFoldMm: string;
  abdominalFoldMm: string;
  frontThighFoldMm: string;
  medialCalfFoldMm: string;
  midAxillaryFoldMm: string;
  pectoralFoldMm: string;
  diameters: Record<DiameterField, string>;
  perimeters: Record<PerimeterField, string>;
}

type MeasurementPayloadField = keyof MeasurementMutationPayload;

const stringValue = (value?: string | number | null) =>
  value === null || value === undefined ? "" : String(value);

const parseInputNumber = (
  value: string,
  emptyValue: null | undefined,
): number | null | undefined => {
  if (!value.trim()) return emptyValue;

  const parsed = Number(value.replace(",", "."));
  return Number.isNaN(parsed) ? emptyValue : parsed;
};

const measurementFieldKeys: MeasurementPayloadField[] = [
  "weight_kg",
  "height_cm",
  "body_fat_pct",
  "upper_body_fat_pct",
  "lower_body_fat_pct",
  "fat_free_mass_kg",
  "muscle_mass_kg",
  "bone_mass_kg",
  "metabolic_age",
  "visceral_fat",
  "water_pct",
  "waist_cm",
  "hip_cm",
  "chest_cm",
  "cephalic_cm",
  "neck_cm",
  "relaxed_arm_midpoint_cm",
  "contracted_arm_midpoint_cm",
  "forearm_cm",
  "wrist_cm",
  "mesosternal_cm",
  "umbilical_cm",
  "biacromial_cm",
  "biiliocrestal_cm",
  "foot_length_cm",
  "thorax_transverse_cm",
  "thorax_anteroposterior_cm",
  "humerus_biepicondylar_cm",
  "wrist_bistyloid_cm",
  "femur_biepicondylar_cm",
  "bimaleolar_cm",
  "foot_transverse_cm",
  "hand_length_cm",
  "hand_transverse_cm",
  "arm_left_cm",
  "arm_right_cm",
  "mid_thigh_cm",
  "calf_cm",
  "thigh_left_cm",
  "thigh_right_cm",
  "calf_left_cm",
  "calf_right_cm",
  "subscapular_fold_mm",
  "triceps_fold_mm",
  "biceps_fold_mm",
  "iliac_crest_fold_mm",
  "supraspinal_fold_mm",
  "abdominal_fold_mm",
  "front_thigh_fold_mm",
  "medial_calf_fold_mm",
  "mid_axillary_fold_mm",
  "pectoral_fold_mm",
];

export const createEmptyCompositionFormValues = (): CompositionFormValues => ({
  peso: "",
  estatura: "",
  fatPercentage: "",
  upperBodyFatPercentage: "",
  lowerBodyFatPercentage: "",
  visceralFatRating: "",
  fatFreeMassKg: "",
  muscleMassKg: "",
  boneMassKg: "",
  bodyWaterPercentage: "",
  metabolicAge: "",
  subscapularFoldMm: "",
  tricepsFoldMm: "",
  bicepsFoldMm: "",
  iliacCrestFoldMm: "",
  supraspinalFoldMm: "",
  abdominalFoldMm: "",
  frontThighFoldMm: "",
  medialCalfFoldMm: "",
  midAxillaryFoldMm: "",
  pectoralFoldMm: "",
  diameters: { ...DEFAULT_DIAMETERS },
  perimeters: { ...DEFAULT_PERIMETERS },
});

export const mapMeasurementToCompositionFormValues = (
  measurement?: ClientMetricHistory | null,
): CompositionFormValues => {
  if (!measurement) {
    return createEmptyCompositionFormValues();
  }

  return {
    peso: stringValue(measurement.weight_kg),
    estatura: stringValue(measurement.height_cm),
    fatPercentage: stringValue(measurement.body_fat_pct),
    upperBodyFatPercentage: stringValue(measurement.upper_body_fat_pct),
    lowerBodyFatPercentage: stringValue(measurement.lower_body_fat_pct),
    visceralFatRating: stringValue(measurement.visceral_fat),
    fatFreeMassKg: stringValue(measurement.fat_free_mass_kg),
    muscleMassKg: stringValue(measurement.muscle_mass_kg),
    boneMassKg: stringValue(measurement.bone_mass_kg),
    bodyWaterPercentage: stringValue(measurement.water_pct),
    metabolicAge: stringValue(measurement.metabolic_age),
    subscapularFoldMm: stringValue(measurement.subscapular_fold_mm),
    tricepsFoldMm: stringValue(measurement.triceps_fold_mm),
    bicepsFoldMm: stringValue(measurement.biceps_fold_mm),
    iliacCrestFoldMm: stringValue(measurement.iliac_crest_fold_mm),
    supraspinalFoldMm: stringValue(measurement.supraspinal_fold_mm),
    abdominalFoldMm: stringValue(measurement.abdominal_fold_mm),
    frontThighFoldMm: stringValue(measurement.front_thigh_fold_mm),
    medialCalfFoldMm: stringValue(measurement.medial_calf_fold_mm),
    midAxillaryFoldMm: stringValue(measurement.mid_axillary_fold_mm),
    pectoralFoldMm: stringValue(measurement.pectoral_fold_mm),
    diameters: {
      biacromial_cm: stringValue(measurement.biacromial_cm),
      biiliocrestal_cm: stringValue(measurement.biiliocrestal_cm),
      foot_length_cm: stringValue(measurement.foot_length_cm),
      thorax_transverse_cm: stringValue(measurement.thorax_transverse_cm),
      thorax_anteroposterior_cm: stringValue(
        measurement.thorax_anteroposterior_cm,
      ),
      humerus_biepicondylar_cm: stringValue(
        measurement.humerus_biepicondylar_cm,
      ),
      wrist_bistyloid_cm: stringValue(measurement.wrist_bistyloid_cm),
      femur_biepicondylar_cm: stringValue(measurement.femur_biepicondylar_cm),
      bimaleolar_cm: stringValue(measurement.bimaleolar_cm),
      foot_transverse_cm: stringValue(measurement.foot_transverse_cm),
      hand_length_cm: stringValue(measurement.hand_length_cm),
      hand_transverse_cm: stringValue(measurement.hand_transverse_cm),
    },
    perimeters: {
      waist_cm: stringValue(measurement.waist_cm),
      hip_cm: stringValue(measurement.hip_cm),
      chest_cm: stringValue(measurement.chest_cm),
      cephalic_cm: stringValue(measurement.cephalic_cm),
      neck_cm: stringValue(measurement.neck_cm),
      mesosternal_cm: stringValue(measurement.mesosternal_cm),
      umbilical_cm: stringValue(measurement.umbilical_cm),
      arm_left_cm: stringValue(measurement.arm_left_cm),
      arm_right_cm: stringValue(measurement.arm_right_cm),
      relaxed_arm_midpoint_cm: stringValue(measurement.relaxed_arm_midpoint_cm),
      contracted_arm_midpoint_cm: stringValue(
        measurement.contracted_arm_midpoint_cm,
      ),
      forearm_cm: stringValue(measurement.forearm_cm),
      wrist_cm: stringValue(measurement.wrist_cm),
      thigh_left_cm: stringValue(measurement.thigh_left_cm),
      thigh_right_cm: stringValue(measurement.thigh_right_cm),
      mid_thigh_cm: stringValue(measurement.mid_thigh_cm),
      calf_cm: stringValue(measurement.calf_cm),
      calf_left_cm: stringValue(measurement.calf_left_cm),
      calf_right_cm: stringValue(measurement.calf_right_cm),
    },
  };
};

export const buildCompositionMutationPayload = (
  values: CompositionFormValues,
  variant: CompositionModalVariant,
): MeasurementMutationPayload => {
  const emptyValue = variant === "edit" ? null : undefined;

  const payload: MeasurementMutationPayload = {
    weight_kg: parseInputNumber(values.peso, emptyValue),
    height_cm: parseInputNumber(values.estatura, emptyValue),
    body_fat_pct: parseInputNumber(values.fatPercentage, emptyValue),
    upper_body_fat_pct: parseInputNumber(
      values.upperBodyFatPercentage,
      emptyValue,
    ),
    lower_body_fat_pct: parseInputNumber(
      values.lowerBodyFatPercentage,
      emptyValue,
    ),
    fat_free_mass_kg: parseInputNumber(values.fatFreeMassKg, emptyValue),
    muscle_mass_kg: parseInputNumber(values.muscleMassKg, emptyValue),
    bone_mass_kg: parseInputNumber(values.boneMassKg, emptyValue),
    metabolic_age: parseInputNumber(values.metabolicAge, emptyValue),
    visceral_fat: parseInputNumber(values.visceralFatRating, emptyValue),
    water_pct: parseInputNumber(values.bodyWaterPercentage, emptyValue),
    subscapular_fold_mm: parseInputNumber(values.subscapularFoldMm, emptyValue),
    triceps_fold_mm: parseInputNumber(values.tricepsFoldMm, emptyValue),
    biceps_fold_mm: parseInputNumber(values.bicepsFoldMm, emptyValue),
    iliac_crest_fold_mm: parseInputNumber(values.iliacCrestFoldMm, emptyValue),
    supraspinal_fold_mm: parseInputNumber(values.supraspinalFoldMm, emptyValue),
    abdominal_fold_mm: parseInputNumber(values.abdominalFoldMm, emptyValue),
    front_thigh_fold_mm: parseInputNumber(values.frontThighFoldMm, emptyValue),
    medial_calf_fold_mm: parseInputNumber(values.medialCalfFoldMm, emptyValue),
    mid_axillary_fold_mm: parseInputNumber(
      values.midAxillaryFoldMm,
      emptyValue,
    ),
    pectoral_fold_mm: parseInputNumber(values.pectoralFoldMm, emptyValue),
    ...Object.fromEntries(
      Object.entries(values.diameters).map(([key, value]) => [
        key,
        parseInputNumber(value, emptyValue),
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(values.perimeters).map(([key, value]) => [
        key,
        parseInputNumber(value, emptyValue),
      ]),
    ),
  };

  if (variant === "edit") {
    return payload;
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as MeasurementMutationPayload;
};

const normalizeHistoryMetricValue = (
  measurement: ClientMetricHistory,
  key: MeasurementPayloadField,
) => {
  const rawValue = measurement[key as keyof ClientMetricHistory];

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return null;
  }

  if (typeof rawValue === "number") {
    return rawValue;
  }

  const parsed = Number(String(rawValue).replace(",", "."));
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizePayloadValue = (value: number | null | undefined) =>
  value === undefined ? null : value;

export const hasCompositionPayloadChanges = (
  measurement: ClientMetricHistory,
  payload: MeasurementMutationPayload,
) =>
  measurementFieldKeys.some(
    (fieldKey) =>
      normalizeHistoryMetricValue(measurement, fieldKey) !==
      normalizePayloadValue(payload[fieldKey]),
  );
