import { describe, expect, it } from "vitest";
import type { ClientMetricHistory } from "@/features/client-history/types";
import {
  buildCompositionMutationPayload,
  hasCompositionPayloadChanges,
  mapMeasurementToCompositionFormValues,
} from "./addMeasurementModal.helpers";

const measurementFactory = (
  partial: Partial<ClientMetricHistory>,
): ClientMetricHistory => ({
  id: "10",
  user_id: 3,
  date: "2026-03-12",
  logged_at: "2026-03-12T10:00:00.000Z",
  weight_kg: "70",
  height_cm: "175",
  body_fat_pct: "20",
  muscle_mass_kg: "30",
  upper_body_fat_pct: null,
  lower_body_fat_pct: null,
  fat_free_mass_kg: null,
  bone_mass_kg: null,
  metabolic_age: null,
  visceral_fat: null,
  water_pct: null,
  waist_cm: null,
  hip_cm: null,
  chest_cm: null,
  cephalic_cm: null,
  neck_cm: null,
  relaxed_arm_midpoint_cm: null,
  contracted_arm_midpoint_cm: null,
  forearm_cm: null,
  wrist_cm: null,
  mesosternal_cm: null,
  umbilical_cm: null,
  biacromial_cm: null,
  biiliocrestal_cm: null,
  foot_length_cm: null,
  thorax_transverse_cm: null,
  thorax_anteroposterior_cm: null,
  humerus_biepicondylar_cm: null,
  wrist_bistyloid_cm: null,
  femur_biepicondylar_cm: null,
  bimaleolar_cm: null,
  foot_transverse_cm: null,
  hand_length_cm: null,
  hand_transverse_cm: null,
  arm_left_cm: null,
  arm_right_cm: null,
  mid_thigh_cm: null,
  calf_cm: null,
  thigh_left_cm: null,
  thigh_right_cm: null,
  calf_left_cm: null,
  calf_right_cm: null,
  subscapular_fold_mm: null,
  triceps_fold_mm: null,
  biceps_fold_mm: null,
  iliac_crest_fold_mm: null,
  supraspinal_fold_mm: null,
  abdominal_fold_mm: null,
  front_thigh_fold_mm: null,
  medial_calf_fold_mm: null,
  mid_axillary_fold_mm: null,
  pectoral_fold_mm: null,
  notes: "",
  recorded_by_user_id: null,
  appointment_id: null,
  ...partial,
});

describe("addMeasurementModal helpers", () => {
  it("maps existing measurements into editable form state", () => {
    const values = mapMeasurementToCompositionFormValues(
      measurementFactory({
        weight_kg: "81.5",
        height_cm: "182",
        waist_cm: "90",
        biacromial_cm: "38.4",
        metabolic_age: 32,
      }),
    );

    expect(values.peso).toBe("81.5");
    expect(values.estatura).toBe("182");
    expect(values.perimeters.waist_cm).toBe("90");
    expect(values.diameters.biacromial_cm).toBe("38.4");
    expect(values.metabolicAge).toBe("32");
    expect(values.perimeters.hip_cm).toBe("");
  });

  it("omits empty fields when building a create payload", () => {
    const payload = buildCompositionMutationPayload(
      {
        ...mapMeasurementToCompositionFormValues(null),
        peso: "80",
        estatura: "180",
        perimeters: {
          ...mapMeasurementToCompositionFormValues(null).perimeters,
          waist_cm: "88",
        },
      },
      "create",
    );

    expect(payload).toMatchObject({
      weight_kg: 80,
      height_cm: 180,
      waist_cm: 88,
    });
    expect(payload.body_fat_pct).toBeUndefined();
    expect(payload.hip_cm).toBeUndefined();
  });

  it("sends nulls for emptied fields in edit mode and detects changes", () => {
    const measurement = measurementFactory({
      weight_kg: "75",
      waist_cm: "89",
      body_fat_pct: "18",
    });
    const payload = buildCompositionMutationPayload(
      {
        ...mapMeasurementToCompositionFormValues(measurement),
        peso: "",
        fatPercentage: "",
        perimeters: {
          ...mapMeasurementToCompositionFormValues(measurement).perimeters,
          waist_cm: "",
        },
      },
      "edit",
    );

    expect(payload.weight_kg).toBeNull();
    expect(payload.body_fat_pct).toBeNull();
    expect(payload.waist_cm).toBeNull();
    expect(hasCompositionPayloadChanges(measurement, payload)).toBe(true);
  });
});
