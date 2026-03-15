import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Activity,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronRight,
  HeartPulse,
  Maximize2,
  Minimize2,
  Ruler,
  Scale,
  Target,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/common/Input";
import type { ClientMetricHistory } from "@/features/client-history/types";
import {
  useSaveClientHealthMetric,
  useSaveClientMetric,
  useUpdateMeasurement,
} from "@/features/client-history/queries";
import {
  buildMeasurementCalculationPreview,
  CALCULATION_CODES,
  type MeasurementCalculationPreview,
} from "@/utils/measurementCalculations";
import {
  buildCompositionMutationPayload,
  createEmptyCompositionFormValues,
  DEFAULT_DIAMETERS,
  DEFAULT_PERIMETERS,
  hasCompositionPayloadChanges,
  mapMeasurementToCompositionFormValues,
  type CompositionFormValues,
  type CompositionModalVariant,
  type DiameterField,
  type PerimeterField,
} from "./addMeasurementModal.helpers";

type MeasurementMode = "composition" | "health";
type CompositionTab =
  | "peso"
  | "bioimpedancia"
  | "pliegues"
  | "diametros"
  | "perimetros"
  | "calculos";

type FrisanchoPreviewDetails = {
  ageRange?: { label?: string };
  derived?: { correctedArmMuscleAreaCm2?: number };
  assessment?: {
    percentileBand?: string;
    classification?: string;
    adequacyPctOfP50?: number;
    approximatePercentile?: number | null;
  };
};

interface AddMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  mode: MeasurementMode;
  clientGenre?: string | null;
  clientDateOfBirth?: string | null;
  variant?: CompositionModalVariant;
  initialMeasurement?: ClientMetricHistory | null;
  measurementId?: string;
  onSuccess?: () => void;
}

const DEFAULT_TAB: CompositionTab = "peso";
const compositionDraftKey = (clientId: string) =>
  `fitpilot_draft_measurements_${clientId}`;
const healthDraftKey = (clientId: string) =>
  `fitpilot_draft_health_metrics_${clientId}`;
const fieldClassName =
  "block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all duration-200 placeholder:text-gray-400 hover:border-gray-300 focus:border-nutrition-400 focus:outline-none focus:ring-2 focus:ring-nutrition-500/20";

type PerimeterFieldConfig = {
  key: PerimeterField;
  label: string;
  placeholder: string;
};

type DiameterFieldConfig = {
  key: DiameterField;
  label: string;
  placeholder: string;
};

const PERIMETER_SECTIONS: Array<{
  title: string;
  description: string;
  fields: PerimeterFieldConfig[];
}> = [
  {
    title: "Tronco",
    description: "Circunferencias centrales para control antropometrico.",
    fields: [
      { key: "waist_cm", label: "Cintura", placeholder: "Ej. 78.5" },
      { key: "hip_cm", label: "Cadera", placeholder: "Ej. 96.0" },
      { key: "chest_cm", label: "Pecho", placeholder: "Ej. 92.4" },
      { key: "mesosternal_cm", label: "Mesoesternal", placeholder: "Ej. 88.0" },
      { key: "umbilical_cm", label: "Umbilical", placeholder: "Ej. 84.2" },
    ],
  },
  {
    title: "Cabeza y miembro superior",
    description: "Perimetros cefalicos y del miembro superior.",
    fields: [
      { key: "cephalic_cm", label: "Cefalico", placeholder: "Ej. 56.2" },
      { key: "neck_cm", label: "Cuello", placeholder: "Ej. 34.8" },
      { key: "arm_left_cm", label: "Brazo Izquierdo", placeholder: "Ej. 30.1" },
      { key: "arm_right_cm", label: "Brazo Derecho", placeholder: "Ej. 30.6" },
      {
        key: "relaxed_arm_midpoint_cm",
        label: "Mitad del Brazo Relajado",
        placeholder: "Ej. 29.7",
      },
      {
        key: "contracted_arm_midpoint_cm",
        label: "Mitad del Brazo Contraido",
        placeholder: "Ej. 31.4",
      },
      { key: "forearm_cm", label: "Antebrazo", placeholder: "Ej. 26.3" },
      { key: "wrist_cm", label: "Muneca", placeholder: "Ej. 16.2" },
    ],
  },
  {
    title: "Miembro inferior",
    description: "Perimetros longitudinales y laterales del tren inferior.",
    fields: [
      { key: "mid_thigh_cm", label: "Muslo Medio", placeholder: "Ej. 54.8" },
      {
        key: "thigh_left_cm",
        label: "Muslo Izquierdo",
        placeholder: "Ej. 55.1",
      },
      {
        key: "thigh_right_cm",
        label: "Muslo Derecho",
        placeholder: "Ej. 55.4",
      },
      { key: "calf_cm", label: "Pantorrilla", placeholder: "Ej. 35.0" },
      {
        key: "calf_left_cm",
        label: "Pantorrilla Izquierda",
        placeholder: "Ej. 35.2",
      },
      {
        key: "calf_right_cm",
        label: "Pantorrilla Derecha",
        placeholder: "Ej. 35.1",
      },
    ],
  },
];

const DIAMETER_SECTIONS: Array<{
  title: string;
  description: string;
  fields: DiameterFieldConfig[];
}> = [
  {
    title: "Tronco",
    description: "Anchos y profundidades centrales para complexión ósea.",
    fields: [
      { key: "biacromial_cm", label: "Biacromial", placeholder: "Ej. 38.5" },
      {
        key: "biiliocrestal_cm",
        label: "Biiliocrestal",
        placeholder: "Ej. 29.4",
      },
      {
        key: "thorax_transverse_cm",
        label: "Transverso del Tórax",
        placeholder: "Ej. 27.2",
      },
      {
        key: "thorax_anteroposterior_cm",
        label: "Anteroposterior del Tórax",
        placeholder: "Ej. 18.1",
      },
    ],
  },
  {
    title: "Segmentos Óseos",
    description: "Diámetros bicondilares y de referencia articular.",
    fields: [
      {
        key: "humerus_biepicondylar_cm",
        label: "Húmero",
        placeholder: "Ej. 6.8",
      },
      {
        key: "wrist_bistyloid_cm",
        label: "Biestiloideo de la Muñeca",
        placeholder: "Ej. 5.4",
      },
      {
        key: "femur_biepicondylar_cm",
        label: "Fémur",
        placeholder: "Ej. 9.7",
      },
      {
        key: "bimaleolar_cm",
        label: "Bimaleolar",
        placeholder: "Ej. 7.2",
      },
    ],
  },
  {
    title: "Mano y Pie",
    description: "Longitudes y anchos distales.",
    fields: [
      {
        key: "foot_length_cm",
        label: "Longitud del Pie",
        placeholder: "Ej. 25.8",
      },
      {
        key: "foot_transverse_cm",
        label: "Transverso del Pie",
        placeholder: "Ej. 9.1",
      },
      {
        key: "hand_length_cm",
        label: "Longitud Mano",
        placeholder: "Ej. 18.4",
      },
      {
        key: "hand_transverse_cm",
        label: "Transverso de la Mano",
        placeholder: "Ej. 8.3",
      },
    ],
  },
];

const CALCULATION_SUBSECTIONS = [
  {
    id: "indicadores-antropometricos",
    label: "Indicadores antropométricos",
    helperText: "IMC e índices derivados de cintura, cadera y estatura.",
  },
  {
    id: "peso-teorico",
    label: "Peso teórico",
    helperText: "Estimaciones de peso objetivo calculadas automáticamente.",
  },
  {
    id: "porcentaje-de-grasa",
    label: "Porcentaje de grasa",
    helperText:
      "Vista previa del valor de bioimpedancia que se usará en los cálculos.",
  },
  {
    id: "componentes-corporales",
    label: "Componentes corporales",
    helperText: "Masa grasa y masa libre de grasa calculadas automáticamente.",
  },
  {
    id: "indicadores-de-frisancho",
    label: "Indicadores de Frisancho",
    helperText:
      "cAMA estimada con referencia adulta por edad y sexo cuando hay datos suficientes.",
  },
] as const;
const THEORETICAL_WEIGHT_METHODS = [
  "Robinson",
  "Metropolitan",
  "Hamwi",
  "Lorentz",
  "Tradicional",
] as const;
type CalculationSubsection = (typeof CALCULATION_SUBSECTIONS)[number]["id"];
const DEFAULT_CALCULATION_SUBSECTION: CalculationSubsection =
  CALCULATION_SUBSECTIONS[0].id;
const isCalculationSubsection = (
  value: unknown,
): value is CalculationSubsection =>
  CALCULATION_SUBSECTIONS.some((section) => section.id === value);

const bmiRanges = [
  {
    label: "Bajo peso",
    shortLabel: "Bajo",
    max: 18.5,
    activeClassName: "bg-sky-400",
    pillClassName: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
  },
  {
    label: "Normal",
    shortLabel: "Normal",
    max: 25,
    activeClassName: "bg-emerald-500",
    pillClassName: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  },
  {
    label: "Sobrepeso",
    shortLabel: "Sobre",
    max: 30,
    activeClassName: "bg-amber-400",
    pillClassName: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  },
  {
    label: "Obesidad",
    shortLabel: "Obes.",
    max: Number.POSITIVE_INFINITY,
    activeClassName: "bg-rose-500",
    pillClassName: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
  },
] as const;

const getCurrentLocalDateTime = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const getBmiRange = (bmi?: number) => {
  if (bmi === undefined) return undefined;
  return (
    bmiRanges.find((range) => bmi < range.max) ??
    bmiRanges[bmiRanges.length - 1]
  );
};

const getAgeFromDateOfBirth = (dateOfBirth?: string | null) => {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
};

const MAX_WEIGHT_KG = 350;
const MAX_HEIGHT_CM = 250;
const calculationFieldLabels: Record<string, string> = {
  weight_kg: "peso",
  height_cm: "estatura",
  body_fat_pct: "% de grasa",
  waist_cm: "cintura",
  hip_cm: "cadera",
  relaxed_arm_midpoint_cm: "brazo relajado",
  triceps_fold_mm: "pliegue tricipital",
  genre: "sexo",
  age_years: "edad",
};
const formatMissingFields = (missingFields?: string[]) => {
  if (!missingFields?.length) return "Faltan datos para calcular.";

  return `Falta ${missingFields
    .map((field) => calculationFieldLabels[field] ?? field)
    .join(", ")}.`;
};
const formatCalculationValue = (result?: MeasurementCalculationPreview) => {
  if (!result || result.status !== "computed" || result.value === null) {
    return "--";
  }

  if (result.unit) {
    return `${result.value.toFixed(2)} ${result.unit}`;
  }

  return result.value.toFixed(3);
};
const theoreticalWeightCodeByLabel = {
  Robinson: CALCULATION_CODES.IDEAL_WEIGHT_ROBINSON,
  Metropolitan: CALCULATION_CODES.IDEAL_WEIGHT_METROPOLITAN,
  Hamwi: CALCULATION_CODES.IDEAL_WEIGHT_HAMWI,
  Lorentz: CALCULATION_CODES.IDEAL_WEIGHT_LORENTZ,
  Tradicional: CALCULATION_CODES.IDEAL_WEIGHT_TRADITIONAL,
} as const;
const COMPOSITION_FLOW_TABS: CompositionTab[] = [
  "peso",
  "bioimpedancia",
  "pliegues",
  "diametros",
  "perimetros",
];

export function AddMeasurementModal({
  isOpen,
  onClose,
  clientId,
  mode,
  clientGenre,
  clientDateOfBirth,
  variant = "create",
  initialMeasurement = null,
  measurementId,
  onSuccess,
}: AddMeasurementModalProps) {
  const [activeMedicionTab, setActiveMedicionTab] =
    useState<CompositionTab>(DEFAULT_TAB);
  const [isMedicionesExpanded, setIsMedicionesExpanded] = useState(true);
  const [isCalculosExpanded, setIsCalculosExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [activeCalculationSubsection, setActiveCalculationSubsection] =
    useState<CalculationSubsection>(DEFAULT_CALCULATION_SUBSECTION);
  const [peso, setPeso] = useState("");
  const [estatura, setEstatura] = useState("");
  const [recordedAt, setRecordedAt] = useState(getCurrentLocalDateTime());
  const [glucoseMgDl, setGlucoseMgDl] = useState("");
  const [glucoseContext, setGlucoseContext] = useState("ayuno");
  const [systolicMmhg, setSystolicMmhg] = useState("");
  const [diastolicMmhg, setDiastolicMmhg] = useState("");
  const [heartRateBpm, setHeartRateBpm] = useState("");
  const [oxygenSaturationPct, setOxygenSaturationPct] = useState("");
  const [notes, setNotes] = useState("");

  // Bioimpedance states
  const [fatPercentage, setFatPercentage] = useState("");
  const [upperBodyFatPercentage, setUpperBodyFatPercentage] = useState("");
  const [lowerBodyFatPercentage, setLowerBodyFatPercentage] = useState("");
  const [visceralFatRating, setVisceralFatRating] = useState("");
  const [fatFreeMassKg, setFatFreeMassKg] = useState("");
  const [muscleMassKg, setMuscleMassKg] = useState("");
  const [boneMassKg, setBoneMassKg] = useState("");
  const [bodyWaterPercentage, setBodyWaterPercentage] = useState("");
  const [metabolicAge, setMetabolicAge] = useState("");

  // Skinfolds states
  const [subscapularFoldMm, setSubscapularFoldMm] = useState("");
  const [tricepsFoldMm, setTricepsFoldMm] = useState("");
  const [bicepsFoldMm, setBicepsFoldMm] = useState("");
  const [iliacCrestFoldMm, setIliacCrestFoldMm] = useState("");
  const [supraspinalFoldMm, setSupraspinalFoldMm] = useState("");
  const [abdominalFoldMm, setAbdominalFoldMm] = useState("");
  const [frontThighFoldMm, setFrontThighFoldMm] = useState("");
  const [medialCalfFoldMm, setMedialCalfFoldMm] = useState("");
  const [midAxillaryFoldMm, setMidAxillaryFoldMm] = useState("");
  const [pectoralFoldMm, setPectoralFoldMm] = useState("");
  const [diameters, setDiameters] = useState<Record<DiameterField, string>>({
    ...DEFAULT_DIAMETERS,
  });
  const [perimeters, setPerimeters] = useState<Record<PerimeterField, string>>({
    ...DEFAULT_PERIMETERS,
  });

  const saveMetricMutation = useSaveClientMetric();
  const updateMeasurementMutation = useUpdateMeasurement();
  const saveHealthMetricMutation = useSaveClientHealthMetric();
  const isHealthMode = mode === "health";
  const isEditComposition = !isHealthMode && variant === "edit";
  const isSaving =
    saveMetricMutation.isPending ||
    updateMeasurementMutation.isPending ||
    saveHealthMetricMutation.isPending;

  const resetCompositionNavigation = () => {
    setActiveMedicionTab(DEFAULT_TAB);
    setIsMedicionesExpanded(true);
    setIsCalculosExpanded(false);
    setActiveCalculationSubsection(DEFAULT_CALCULATION_SUBSECTION);
  };

  const applyCompositionFormValues = (values: CompositionFormValues) => {
    setPeso(values.peso);
    setEstatura(values.estatura);
    setFatPercentage(values.fatPercentage);
    setUpperBodyFatPercentage(values.upperBodyFatPercentage);
    setLowerBodyFatPercentage(values.lowerBodyFatPercentage);
    setVisceralFatRating(values.visceralFatRating);
    setFatFreeMassKg(values.fatFreeMassKg);
    setMuscleMassKg(values.muscleMassKg);
    setBoneMassKg(values.boneMassKg);
    setBodyWaterPercentage(values.bodyWaterPercentage);
    setMetabolicAge(values.metabolicAge);
    setSubscapularFoldMm(values.subscapularFoldMm);
    setTricepsFoldMm(values.tricepsFoldMm);
    setBicepsFoldMm(values.bicepsFoldMm);
    setIliacCrestFoldMm(values.iliacCrestFoldMm);
    setSupraspinalFoldMm(values.supraspinalFoldMm);
    setAbdominalFoldMm(values.abdominalFoldMm);
    setFrontThighFoldMm(values.frontThighFoldMm);
    setMedialCalfFoldMm(values.medialCalfFoldMm);
    setMidAxillaryFoldMm(values.midAxillaryFoldMm);
    setPectoralFoldMm(values.pectoralFoldMm);
    setDiameters({ ...values.diameters });
    setPerimeters({ ...values.perimeters });
  };

  const getCompositionFormValues = (): CompositionFormValues => ({
    peso,
    estatura,
    fatPercentage,
    upperBodyFatPercentage,
    lowerBodyFatPercentage,
    visceralFatRating,
    fatFreeMassKg,
    muscleMassKg,
    boneMassKg,
    bodyWaterPercentage,
    metabolicAge,
    subscapularFoldMm,
    tricepsFoldMm,
    bicepsFoldMm,
    iliacCrestFoldMm,
    supraspinalFoldMm,
    abdominalFoldMm,
    frontThighFoldMm,
    medialCalfFoldMm,
    midAxillaryFoldMm,
    pectoralFoldMm,
    diameters,
    perimeters,
  });

  useEffect(() => {
    if (!isOpen || !clientId) return;

    if (isHealthMode) {
      const draft = localStorage.getItem(healthDraftKey(clientId));
      if (!draft) {
        setRecordedAt(getCurrentLocalDateTime());
        setGlucoseMgDl("");
        setGlucoseContext("ayuno");
        setSystolicMmhg("");
        setDiastolicMmhg("");
        setHeartRateBpm("");
        setOxygenSaturationPct("");
        setNotes("");
        return;
      }

      try {
        const parsed = JSON.parse(draft);
        setRecordedAt(parsed.recordedAt || getCurrentLocalDateTime());
        setGlucoseMgDl(parsed.glucoseMgDl || "");
        setGlucoseContext(parsed.glucoseContext || "ayuno");
        setSystolicMmhg(parsed.systolicMmhg || "");
        setDiastolicMmhg(parsed.diastolicMmhg || "");
        setHeartRateBpm(parsed.heartRateBpm || "");
        setOxygenSaturationPct(parsed.oxygenSaturationPct || "");
        setNotes(parsed.notes || "");
      } catch (error) {
        console.error("Error parsing health draft:", error);
      }
      return;
    }

    if (isEditComposition) {
      resetCompositionNavigation();
      applyCompositionFormValues(
        mapMeasurementToCompositionFormValues(initialMeasurement),
      );
      return;
    }

    const draft = localStorage.getItem(compositionDraftKey(clientId));
    if (!draft) {
      resetCompositionNavigation();
      applyCompositionFormValues(createEmptyCompositionFormValues());
      return;
    }

    try {
      const parsed = JSON.parse(draft);
      setActiveMedicionTab(parsed.activeMedicionTab || DEFAULT_TAB);
      setIsMedicionesExpanded(parsed.isMedicionesExpanded ?? true);
      setIsCalculosExpanded(parsed.isCalculosExpanded ?? false);
      setActiveCalculationSubsection(
        isCalculationSubsection(parsed.activeCalculationSubsection)
          ? parsed.activeCalculationSubsection
          : DEFAULT_CALCULATION_SUBSECTION,
      );
      applyCompositionFormValues({
        ...createEmptyCompositionFormValues(),
        peso: parsed.peso || "",
        estatura: parsed.estatura || "",
        fatPercentage: parsed.fatPercentage || "",
        upperBodyFatPercentage: parsed.upperBodyFatPercentage || "",
        lowerBodyFatPercentage: parsed.lowerBodyFatPercentage || "",
        visceralFatRating: parsed.visceralFatRating || "",
        fatFreeMassKg: parsed.fatFreeMassKg || "",
        muscleMassKg: parsed.muscleMassKg || "",
        boneMassKg: parsed.boneMassKg || "",
        bodyWaterPercentage: parsed.bodyWaterPercentage || "",
        metabolicAge: parsed.metabolicAge || "",
        subscapularFoldMm: parsed.subscapularFoldMm || "",
        tricepsFoldMm: parsed.tricepsFoldMm || "",
        bicepsFoldMm: parsed.bicepsFoldMm || "",
        iliacCrestFoldMm: parsed.iliacCrestFoldMm || "",
        supraspinalFoldMm: parsed.supraspinalFoldMm || "",
        abdominalFoldMm: parsed.abdominalFoldMm || "",
        frontThighFoldMm: parsed.frontThighFoldMm || "",
        medialCalfFoldMm: parsed.medialCalfFoldMm || "",
        midAxillaryFoldMm: parsed.midAxillaryFoldMm || "",
        pectoralFoldMm: parsed.pectoralFoldMm || "",
        diameters: { ...DEFAULT_DIAMETERS, ...(parsed.diameters || {}) },
        perimeters: { ...DEFAULT_PERIMETERS, ...(parsed.perimeters || {}) },
      });
    } catch (error) {
      console.error("Error parsing composition draft:", error);
    }
  }, [clientId, initialMeasurement, isEditComposition, isHealthMode, isOpen]);

  useEffect(() => {
    if (!isOpen || !clientId || isHealthMode || isEditComposition) return;
    localStorage.setItem(
      compositionDraftKey(clientId),
      JSON.stringify({
        activeMedicionTab,
        isMedicionesExpanded,
        isCalculosExpanded,
        activeCalculationSubsection,
        peso,
        estatura,
        fatPercentage,
        upperBodyFatPercentage,
        lowerBodyFatPercentage,
        visceralFatRating,
        fatFreeMassKg,
        muscleMassKg,
        boneMassKg,
        bodyWaterPercentage,
        metabolicAge,
        subscapularFoldMm,
        tricepsFoldMm,
        bicepsFoldMm,
        iliacCrestFoldMm,
        supraspinalFoldMm,
        abdominalFoldMm,
        frontThighFoldMm,
        medialCalfFoldMm,
        midAxillaryFoldMm,
        pectoralFoldMm,
        diameters,
        perimeters,
      }),
    );
  }, [
    activeMedicionTab,
    activeCalculationSubsection,
    clientId,
    estatura,
    isEditComposition,
    isHealthMode,
    isCalculosExpanded,
    isMedicionesExpanded,
    isOpen,
    peso,
    fatPercentage,
    upperBodyFatPercentage,
    lowerBodyFatPercentage,
    visceralFatRating,
    fatFreeMassKg,
    muscleMassKg,
    boneMassKg,
    bodyWaterPercentage,
    metabolicAge,
    subscapularFoldMm,
    tricepsFoldMm,
    bicepsFoldMm,
    iliacCrestFoldMm,
    supraspinalFoldMm,
    abdominalFoldMm,
    frontThighFoldMm,
    medialCalfFoldMm,
    midAxillaryFoldMm,
    pectoralFoldMm,
    diameters,
    perimeters,
  ]);

  useEffect(() => {
    if (!isOpen || !clientId || !isHealthMode) return;
    localStorage.setItem(
      healthDraftKey(clientId),
      JSON.stringify({
        recordedAt,
        glucoseMgDl,
        glucoseContext,
        systolicMmhg,
        diastolicMmhg,
        heartRateBpm,
        oxygenSaturationPct,
        notes,
      }),
    );
  }, [
    clientId,
    diastolicMmhg,
    glucoseContext,
    glucoseMgDl,
    heartRateBpm,
    isHealthMode,
    isOpen,
    notes,
    oxygenSaturationPct,
    recordedAt,
    systolicMmhg,
  ]);

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return undefined;
    const parsed = Number(value.replace(",", "."));
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const compactPayload = <T extends Record<string, unknown>>(payload: T) =>
    Object.fromEntries(
      Object.entries(payload).filter(
        ([, value]) => value !== undefined && value !== "",
      ),
    ) as Partial<T>;

  const handleBoundedMetricChange = (
    nextValue: string,
    setValue: (value: string) => void,
    max: number,
  ) => {
    if (!nextValue.trim()) {
      setValue("");
      return;
    }

    const normalizedValue = nextValue.replace(",", ".");
    const parsed = Number(normalizedValue);

    if (!Number.isFinite(parsed)) {
      setValue(nextValue);
      return;
    }

    if (parsed <= max) {
      setValue(nextValue);
    }
  };

  const weightValue = parseOptionalNumber(peso);
  const heightValue = parseOptionalNumber(estatura);
  const bioimpedanciaBodyFat = parseOptionalNumber(fatPercentage);
  const waistValue = parseOptionalNumber(perimeters.waist_cm);
  const hipValue = parseOptionalNumber(perimeters.hip_cm);
  const relaxedArmMidpointValue = parseOptionalNumber(
    perimeters.relaxed_arm_midpoint_cm,
  );
  const tricepsFoldValue = parseOptionalNumber(tricepsFoldMm);
  const clientAgeYears = getAgeFromDateOfBirth(clientDateOfBirth);
  const calculationPreview = buildMeasurementCalculationPreview({
    measurement: {
      weight_kg: weightValue,
      height_cm: heightValue,
      body_fat_pct: bioimpedanciaBodyFat,
      waist_cm: waistValue,
      hip_cm: hipValue,
      relaxed_arm_midpoint_cm: relaxedArmMidpointValue,
      triceps_fold_mm: tricepsFoldValue,
    },
    userGenre: clientGenre,
    userAgeYears: clientAgeYears,
  });
  const bmiPreview = calculationPreview[CALCULATION_CODES.BMI];
  const bmiValue =
    bmiPreview.status === "computed" && bmiPreview.value !== null
      ? bmiPreview.value
      : undefined;
  const bmiRange = getBmiRange(bmiValue);
  const anthropometricResults = [
    {
      label: "Índice de masa corporal",
      description: "Basado en peso y estatura.",
      result: calculationPreview[CALCULATION_CODES.BMI],
    },
    {
      label: "Índice cintura-cadera",
      description: "Basado en cintura y cadera.",
      result: calculationPreview[CALCULATION_CODES.WAIST_HIP_RATIO],
    },
    {
      label: "Índice cintura-estatura",
      description: "Basado en cintura y estatura.",
      result: calculationPreview[CALCULATION_CODES.WAIST_HEIGHT_RATIO],
    },
  ];
  const idealWeightResults = THEORETICAL_WEIGHT_METHODS.map((label) => ({
    label,
    result: calculationPreview[theoreticalWeightCodeByLabel[label]],
  }));
  const compositionResults = [
    {
      label: "Masa grasa",
      description: "Peso × % grasa / 100",
      result: calculationPreview[CALCULATION_CODES.FAT_MASS_KG],
    },
    {
      label: "Masa libre de grasa",
      description: "Peso - masa grasa",
      result: calculationPreview[CALCULATION_CODES.LEAN_MASS_KG],
    },
  ];
  const frisanchoResult =
    calculationPreview[CALCULATION_CODES.FRISANCHO_INDICATORS];
  const frisanchoDetails = (frisanchoResult.details ??
    null) as FrisanchoPreviewDetails | null;
  const selectedCalculationSubsection =
    CALCULATION_SUBSECTIONS.find(
      (section) => section.id === activeCalculationSubsection,
    ) ?? CALCULATION_SUBSECTIONS[0];
  const editMeasurementDateLabel =
    isEditComposition && initialMeasurement
      ? format(
          new Date(initialMeasurement.logged_at || initialMeasurement.date),
          "dd MMM yyyy, HH:mm",
          { locale: es },
        )
      : null;

  const handleCalculosToggle = () => {
    if (activeMedicionTab !== "calculos") {
      setActiveMedicionTab("calculos");
      setIsCalculosExpanded(true);
      return;
    }

    setIsCalculosExpanded((current) => !current);
  };

  const handleClear = () => {
    if (isHealthMode) {
      setRecordedAt(getCurrentLocalDateTime());
      setGlucoseMgDl("");
      setGlucoseContext("ayuno");
      setSystolicMmhg("");
      setDiastolicMmhg("");
      setHeartRateBpm("");
      setOxygenSaturationPct("");
      setNotes("");
      localStorage.removeItem(healthDraftKey(clientId));
      return;
    }

    resetCompositionNavigation();

    if (isEditComposition) {
      applyCompositionFormValues(
        mapMeasurementToCompositionFormValues(initialMeasurement),
      );
      return;
    }

    applyCompositionFormValues(createEmptyCompositionFormValues());

    localStorage.removeItem(compositionDraftKey(clientId));
  };

  const handleSave = async () => {
    const numericClientId = Number(clientId);
    if (!numericClientId) {
      toast.error("No se pudo identificar al paciente.");
      return;
    }

    if (isHealthMode) {
      const payload = compactPayload({
        user_id: numericClientId,
        recorded_at: recordedAt
          ? new Date(recordedAt).toISOString()
          : undefined,
        glucose_mg_dl: parseOptionalNumber(glucoseMgDl),
        glucose_context: glucoseMgDl ? glucoseContext : undefined,
        systolic_mmhg: parseOptionalNumber(systolicMmhg),
        diastolic_mmhg: parseOptionalNumber(diastolicMmhg),
        heart_rate_bpm: parseOptionalNumber(heartRateBpm),
        oxygen_saturation_pct: parseOptionalNumber(oxygenSaturationPct),
        notes: notes.trim() || undefined,
      });

      const hasHealthValues = Object.entries(payload).some(
        ([key, value]) =>
          !["user_id", "recorded_at"].includes(key) &&
          value !== undefined &&
          value !== "",
      );
      if (!hasHealthValues) {
        toast.error("Ingresa al menos una métrica de salud.");
        return;
      }
      if (
        (payload.systolic_mmhg && !payload.diastolic_mmhg) ||
        (!payload.systolic_mmhg && payload.diastolic_mmhg)
      ) {
        toast.error("Para presión arterial captura sistólica y diastólica.");
        return;
      }

      try {
        await saveHealthMetricMutation.mutateAsync(payload);
        localStorage.removeItem(healthDraftKey(clientId));
        toast.success("Métrica de salud guardada correctamente.");
        onClose();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "No se pudo guardar la métrica de salud.",
        );
      }
      return;
    }

    const payload = buildCompositionMutationPayload(
      getCompositionFormValues(),
      isEditComposition ? "edit" : "create",
    );

    if (
      payload.weight_kg !== undefined &&
      payload.weight_kg !== null &&
      (payload.weight_kg <= 0 || payload.weight_kg > MAX_WEIGHT_KG)
    ) {
      toast.error(`El peso debe estar entre 0.1 y ${MAX_WEIGHT_KG} kg.`);
      return;
    }

    if (
      payload.height_cm !== undefined &&
      payload.height_cm !== null &&
      (payload.height_cm <= 0 || payload.height_cm > MAX_HEIGHT_CM)
    ) {
      toast.error(`La estatura debe estar entre 0.1 y ${MAX_HEIGHT_CM} cm.`);
      return;
    }

    if (isEditComposition) {
      if (!measurementId || !initialMeasurement) {
        toast.error("No se pudo identificar la medición a editar.");
        return;
      }

      if (!hasCompositionPayloadChanges(initialMeasurement, payload)) {
        toast.error("No hay cambios por guardar.");
        return;
      }

      try {
        await updateMeasurementMutation.mutateAsync({
          measurementId,
          payload,
        });
        toast.success("Medición corporal actualizada correctamente.");
        onSuccess?.();
        onClose();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "No se pudo actualizar la medición.",
        );
      }
      return;
    }

    const hasCompositionValues = Object.values(payload).some(
      (value) => value !== undefined,
    );

    if (!hasCompositionValues) {
      toast.error("Ingresa al menos un valor de medición.");
      return;
    }

    try {
      await saveMetricMutation.mutateAsync({
        user_id: numericClientId,
        ...payload,
      });
      localStorage.removeItem(compositionDraftKey(clientId));
      toast.success("Medición corporal guardada correctamente.");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo guardar la medición.",
      );
    }
  };

  const handlePrimaryAction = () => {
    if (isHealthMode || isEditComposition) {
      void handleSave();
      return;
    }

    const currentTabIndex = COMPOSITION_FLOW_TABS.indexOf(activeMedicionTab);
    const isFlowTab = currentTabIndex !== -1;
    const isLastFlowTab = currentTabIndex === COMPOSITION_FLOW_TABS.length - 1;

    if (isFlowTab && !isLastFlowTab) {
      setActiveMedicionTab(COMPOSITION_FLOW_TABS[currentTabIndex + 1]);
      return;
    }

    void handleSave();
  };

  const compositionPrimaryLabel = (() => {
    if (isEditComposition) {
      return "Guardar cambios";
    }

    const currentTabIndex = COMPOSITION_FLOW_TABS.indexOf(activeMedicionTab);
    if (
      currentTabIndex !== -1 &&
      currentTabIndex < COMPOSITION_FLOW_TABS.length - 1
    ) {
      return "Siguiente";
    }

    return "Guardar Medición";
  })();
  const activeCompositionContentKey =
    activeMedicionTab === "calculos"
      ? `calculos-${activeCalculationSubsection}`
      : activeMedicionTab;

  const compositionContent = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 animate-in fade-in duration-300">
      {isEditComposition && editMeasurementDateLabel ? (
        <div className="rounded-2xl border border-nutrition-100 bg-linear-to-r from-nutrition-50 via-white to-emerald-50 px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2 text-nutrition-600 shadow-sm ring-1 ring-nutrition-100">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Fecha del registro
                </p>
                <p className="mt-1 text-base font-bold text-gray-900">
                  {editMeasurementDateLabel}
                </p>
              </div>
            </div>
            <p className="max-w-md text-sm text-gray-500">
              Esta fecha es sólo informativa. Al guardar, los resultados se
              volverán a calcular usando la fecha original de esta medición.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-6 md:flex-row">
        <div className="flex w-full shrink-0 flex-col space-y-1 overflow-y-auto pr-2 md:w-max">
          <div className="mb-2">
            <button
              onClick={() => setIsMedicionesExpanded(!isMedicionesExpanded)}
              className="flex w-full items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100"
            >
              <span>Mediciones</span>
              {isMedicionesExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div
              className={`flex items-center space-x-2 overflow-hidden transition-all duration-300 ${isMedicionesExpanded ? "mt-2 max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className="ml-5 h-full w-0.5 shrink-0 rounded-full bg-gray-100"></div>
              <div className="flex flex-1 flex-col space-y-1">
                {[
                  ["peso", "Peso y Estatura"],
                  ["bioimpedancia", "Bioimpedancia"],
                  ["pliegues", "Pliegues"],
                  ["diametros", "Diámetros"],
                  ["perimetros", "Perímetros"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() =>
                      setActiveMedicionTab(value as CompositionTab)
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-left text-sm font-medium transition-colors ${
                      activeMedicionTab === value
                        ? "border border-nutrition-100 bg-nutrition-50 text-nutrition-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleCalculosToggle}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                activeMedicionTab === "calculos"
                  ? "border border-nutrition-100 bg-nutrition-50 text-nutrition-700"
                  : "bg-gray-50 text-gray-900 hover:bg-gray-100"
              }`}
            >
              <span>Cálculos</span>
              {isCalculosExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )}
            </button>
            <div
              className={`flex items-center space-x-2 overflow-hidden transition-all duration-300 ${
                isCalculosExpanded
                  ? "mt-2 max-h-[420px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <div className="ml-5 h-full w-0.5 shrink-0 rounded-full bg-gray-100" />
              <div className="flex flex-1 flex-col space-y-1">
                {CALCULATION_SUBSECTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveMedicionTab("calculos");
                      setActiveCalculationSubsection(item.id);
                    }}
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-left text-sm font-medium transition-colors ${
                      activeMedicionTab === "calculos" &&
                      activeCalculationSubsection === item.id
                        ? "border border-nutrition-100 bg-nutrition-50 text-nutrition-700"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          key={activeCompositionContentKey}
          className="flex-1 overflow-y-auto rounded-2xl border border-gray-100 bg-gray-50 p-6 animate-in fade-in slide-in-from-right-2 duration-300"
        >
          {activeMedicionTab === "peso" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Peso y Estatura
                  </h4>
                  <p className="text-sm text-gray-500">
                    Métricas base corporales
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input
                    label="Peso Corporal"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={MAX_WEIGHT_KG}
                    placeholder="Ej. 75.5"
                    value={peso}
                    onChange={(e) =>
                      handleBoundedMetricChange(
                        e.target.value,
                        setPeso,
                        MAX_WEIGHT_KG,
                      )
                    }
                    helperText={`Máximo ${MAX_WEIGHT_KG} kg`}
                    rightElement={
                      <span className="mr-3 text-sm font-medium text-gray-400">
                        kg
                      </span>
                    }
                  />
                  <Input
                    label="Estatura"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max={MAX_HEIGHT_CM}
                    placeholder="Ej. 175"
                    value={estatura}
                    onChange={(e) =>
                      handleBoundedMetricChange(
                        e.target.value,
                        setEstatura,
                        MAX_HEIGHT_CM,
                      )
                    }
                    helperText={`Máximo ${MAX_HEIGHT_CM} cm`}
                    rightElement={
                      <span className="mr-3 text-sm font-medium text-gray-400">
                        cm
                      </span>
                    }
                  />
                </div>

                <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                        IMC
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {bmiValue !== undefined ? bmiValue.toFixed(2) : "--"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            bmiRange?.pillClassName ??
                            "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {bmiRange?.label ?? "Captura peso y estatura"}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Indicador automático según peso y estatura.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {bmiRanges.map((range) => {
                      const isActive = range.label === bmiRange?.label;

                      return (
                        <div key={range.label} className="space-y-1">
                          <div
                            className={`h-1.5 rounded-full ${isActive ? range.activeClassName : "bg-gray-200"}`}
                          />
                          <span
                            className={`block text-center text-[11px] font-medium ${isActive ? "text-gray-900" : "text-gray-400"}`}
                          >
                            {range.shortLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeMedicionTab === "bioimpedancia" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Análisis de Bioimpedancia
                  </h4>
                  <p className="text-sm text-gray-500">
                    Composición corporal detallada
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Input
                      label="Grasa total"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 20.3"
                      value={fatPercentage}
                      onChange={(e) => setFatPercentage(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          %
                        </span>
                      }
                      helperText={
                        calculationPreview[CALCULATION_CODES.FAT_MASS_KG]
                          .status === "computed"
                          ? `Masa grasa calculada: ${formatCalculationValue(
                              calculationPreview[CALCULATION_CODES.FAT_MASS_KG],
                            )}`
                          : undefined
                      }
                    />
                    <Input
                      label="Masa muscular"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 27.9"
                      value={muscleMassKg}
                      onChange={(e) => setMuscleMassKg(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          kg
                        </span>
                      }
                      helperText={
                        peso && muscleMassKg
                          ? `${(((parseOptionalNumber(muscleMassKg) || 0) / (parseOptionalNumber(peso) || 1)) * 100).toFixed(1)} %`
                          : undefined
                      }
                    />
                  </div>

                  <div className="h-px w-full bg-gray-100" />

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Input
                      label="Grasa en sección superior"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 18.5"
                      value={upperBodyFatPercentage}
                      onChange={(e) =>
                        setUpperBodyFatPercentage(e.target.value)
                      }
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          %
                        </span>
                      }
                    />
                    <Input
                      label="Grasa en sección inferior"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 22.1"
                      value={lowerBodyFatPercentage}
                      onChange={(e) =>
                        setLowerBodyFatPercentage(e.target.value)
                      }
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          %
                        </span>
                      }
                    />
                    <Input
                      label="Grasa visceral"
                      type="number"
                      step="1"
                      placeholder="Ej. 12"
                      value={visceralFatRating}
                      onChange={(e) => setVisceralFatRating(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          Rating
                        </span>
                      }
                    />
                  </div>

                  <div className="h-px w-full bg-gray-100" />

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Input
                      label="Masa libre de grasa"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 55.4"
                      value={fatFreeMassKg}
                      onChange={(e) => setFatFreeMassKg(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          kg
                        </span>
                      }
                      helperText={
                        calculationPreview[CALCULATION_CODES.LEAN_MASS_KG]
                          .status === "computed"
                          ? `Backend: ${formatCalculationValue(
                              calculationPreview[
                                CALCULATION_CODES.LEAN_MASS_KG
                              ],
                            )}`
                          : undefined
                      }
                    />
                    <Input
                      label="Peso óseo"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 2.8"
                      value={boneMassKg}
                      onChange={(e) => setBoneMassKg(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          kg
                        </span>
                      }
                    />
                    <Input
                      label="Agua corporal"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 55.0"
                      value={bodyWaterPercentage}
                      onChange={(e) => setBodyWaterPercentage(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          %
                        </span>
                      }
                    />
                    <Input
                      label="Edad metabólica"
                      type="number"
                      step="1"
                      placeholder="Ej. 28"
                      value={metabolicAge}
                      onChange={(e) => setMetabolicAge(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          años
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeMedicionTab === "pliegues" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Pliegues Cutáneos
                  </h4>
                  <p className="text-sm text-gray-500">
                    Medición en milímetros para estimar grasa corporal
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Input
                      label="Subescapular"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 12"
                      value={subscapularFoldMm}
                      onChange={(e) => setSubscapularFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Tríceps"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 15"
                      value={tricepsFoldMm}
                      onChange={(e) => setTricepsFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Bíceps"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 8"
                      value={bicepsFoldMm}
                      onChange={(e) => setBicepsFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Cresta ilíaca"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 18"
                      value={iliacCrestFoldMm}
                      onChange={(e) => setIliacCrestFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Supraespinal"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 14"
                      value={supraspinalFoldMm}
                      onChange={(e) => setSupraspinalFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Abdominal"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 20"
                      value={abdominalFoldMm}
                      onChange={(e) => setAbdominalFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Muslo frontal"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 16"
                      value={frontThighFoldMm}
                      onChange={(e) => setFrontThighFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Pantorrilla medial"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 10"
                      value={medialCalfFoldMm}
                      onChange={(e) => setMedialCalfFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Axilar medial"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 11"
                      value={midAxillaryFoldMm}
                      onChange={(e) => setMidAxillaryFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                    <Input
                      label="Pectoral"
                      type="number"
                      step="0.1"
                      placeholder="Ej. 9"
                      value={pectoralFoldMm}
                      onChange={(e) => setPectoralFoldMm(e.target.value)}
                      rightElement={
                        <span className="mr-3 text-sm font-medium text-gray-400">
                          mm
                        </span>
                      }
                    />
                  </div>

                  <p className="text-xs text-gray-400 mt-4">
                    * No es necesario completar todos los campos; sin embargo,
                    entre más datos, mejor será la estimación del paciente.
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeMedicionTab === "diametros" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Diámetros Óseos
                  </h4>
                  <p className="text-sm text-gray-500">
                    Registro de medidas óseas para determinar la complexión
                    física.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {DIAMETER_SECTIONS.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5">
                      <h5 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                        {section.title}
                      </h5>
                      <p className="mt-1 text-sm text-gray-500">
                        {section.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <Input
                          key={field.key}
                          label={field.label}
                          type="number"
                          step="0.1"
                          placeholder={field.placeholder}
                          value={diameters[field.key]}
                          onChange={(e) =>
                            setDiameters((current) => ({
                              ...current,
                              [field.key]: e.target.value,
                            }))
                          }
                          rightElement={
                            <span className="mr-3 text-sm font-medium text-gray-400">
                              cm
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  Completa solo los diámetros disponibles para este registro;
                  los campos vacíos se omiten al guardar.
                </p>
              </div>
            </div>
          )}
          {activeMedicionTab === "perimetros" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <Ruler className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">
                    Perímetros
                  </h4>
                  <p className="text-sm text-gray-500">
                    Registro de circunferencias corporales sin duplicar medidas
                    existentes.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {PERIMETER_SECTIONS.map((section) => (
                  <div
                    key={section.title}
                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-5">
                      <h5 className="text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
                        {section.title}
                      </h5>
                      <p className="mt-1 text-sm text-gray-500">
                        {section.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      {section.fields.map((field) => (
                        <Input
                          key={field.key}
                          label={field.label}
                          type="number"
                          step="0.1"
                          placeholder={field.placeholder}
                          value={perimeters[field.key]}
                          onChange={(e) =>
                            setPerimeters((current) => ({
                              ...current,
                              [field.key]: e.target.value,
                            }))
                          }
                          rightElement={
                            <span className="mr-3 text-sm font-medium text-gray-400">
                              cm
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  Completa solo las circunferencias disponibles para este
                  registro; los campos vacíos se omiten al guardar.
                </p>
              </div>
            </div>
          )}
          {activeMedicionTab === "calculos" && (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-nutrition-100 p-2 text-nutrition-600">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Cálculos</h4>
                  <p className="text-sm text-gray-500">
                    Subcategoría seleccionada para análisis y proyecciones.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Subsección activa
                </div>
                <h5 className="text-xl font-bold text-gray-900">
                  {selectedCalculationSubsection.label}
                </h5>
                <p className="mt-2 text-sm text-gray-500">
                  {selectedCalculationSubsection.helperText}
                </p>
                {selectedCalculationSubsection.id ===
                "indicadores-antropometricos" ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {anthropometricResults.map(
                      ({ label, description, result }) => (
                        <article
                          key={label}
                          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                            {label}
                          </p>
                          <p className="mt-3 text-2xl font-bold text-gray-900">
                            {formatCalculationValue(result)}
                          </p>
                          <p className="mt-2 text-sm text-gray-500">
                            {result.status === "computed"
                              ? description
                              : formatMissingFields(result.missingFields)}
                          </p>
                        </article>
                      ),
                    )}
                  </div>
                ) : selectedCalculationSubsection.id === "peso-teorico" ? (
                  <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="space-y-3">
                      {idealWeightResults.map(({ label, result }) => (
                        <div
                          key={label}
                          className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[170px_1fr]"
                        >
                          <label className="text-sm font-semibold text-gray-700">
                            {label}
                          </label>
                          <div>
                            <input
                              type="text"
                              readOnly
                              value={
                                result.status === "computed"
                                  ? formatCalculationValue(result)
                                  : ""
                              }
                              placeholder="Pendiente de cálculo"
                              className={fieldClassName}
                            />
                            {result.status !== "computed" && (
                              <p className="mt-1 text-xs text-amber-600">
                                {formatMissingFields(result.missingFields)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedCalculationSubsection.id ===
                  "porcentaje-de-grasa" ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                            Bioimpedancia
                          </p>
                          <p className="mt-2 text-2xl font-bold text-gray-900">
                            {formatCalculationValue(
                              calculationPreview[
                                CALCULATION_CODES.BODY_FAT_PCT_BIOIMPEDANCE
                              ],
                            )}
                          </p>
                        </div>
                        <span className="rounded-full bg-nutrition-50 px-3 py-1 text-xs font-semibold text-nutrition-700 ring-1 ring-nutrition-100">
                          Cálculo automático
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-gray-500">
                        {calculationPreview[
                          CALCULATION_CODES.BODY_FAT_PCT_BIOIMPEDANCE
                        ].status === "computed"
                          ? "Este valor se toma directamente de la captura de bioimpedancia y se ajusta igual que al guardarlo."
                          : formatMissingFields(
                              calculationPreview[
                                CALCULATION_CODES.BODY_FAT_PCT_BIOIMPEDANCE
                              ].missingFields,
                            )}
                      </p>
                    </div>
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                      Por ahora este cálculo usa el porcentaje de grasa
                      capturado. Las demás ecuaciones todavía no están
                      disponibles en esta vista.
                    </div>
                  </div>
                ) : selectedCalculationSubsection.id ===
                  "componentes-corporales" ? (
                  <div className="mt-5 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {compositionResults.map(
                        ({ label, description, result }) => (
                          <article
                            key={label}
                            className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                              {label}
                            </p>
                            <p className="mt-3 text-2xl font-bold text-gray-900">
                              {formatCalculationValue(result)}
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              {result.status === "computed"
                                ? description
                                : formatMissingFields(result.missingFields)}
                            </p>
                          </article>
                        ),
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                        Datos capturados manualmente
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-700">
                            Masa muscular
                          </p>
                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {muscleMassKg || "--"}
                            <span className="ml-1 text-sm font-medium text-gray-500">
                              kg
                            </span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-700">
                            Peso óseo
                          </p>
                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {boneMassKg || "--"}
                            <span className="ml-1 text-sm font-medium text-gray-500">
                              kg
                            </span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-700">
                            Agua corporal
                          </p>
                          <p className="mt-2 text-xl font-bold text-gray-900">
                            {bodyWaterPercentage || "--"}
                            <span className="ml-1 text-sm font-medium text-gray-500">
                              %
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedCalculationSubsection.id ===
                  "indicadores-de-frisancho" ? (
                  <div
                    className={`mt-5 rounded-xl border p-5 ${
                      frisanchoResult.status === "computed"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={`mt-0.5 h-5 w-5 ${
                          frisanchoResult.status === "computed"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }`}
                      />
                      <div className="w-full">
                        <h6
                          className={`text-base font-semibold ${
                            frisanchoResult.status === "computed"
                              ? "text-emerald-900"
                              : "text-amber-900"
                          }`}
                        >
                          {frisanchoResult.status === "computed"
                            ? "Referencia de Frisancho lista"
                            : "Frisancho no disponible todavia"}
                        </h6>
                        <p
                          className={`mt-2 text-sm ${
                            frisanchoResult.status === "computed"
                              ? "text-emerald-800"
                              : "text-amber-800"
                          }`}
                        >
                          {frisanchoResult.status === "computed"
                            ? "Vista previa local de cAMA con referencia adulta por edad y sexo."
                            : (frisanchoResult.message ??
                              "El calculo de Frisancho aun no esta disponible.")}
                        </p>
                        {frisanchoResult.status === "computed" &&
                        frisanchoDetails ? (
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="rounded-xl bg-white/80 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                cAMA
                              </p>
                              <p className="mt-2 text-2xl font-bold text-gray-900">
                                {frisanchoDetails.derived?.correctedArmMuscleAreaCm2?.toFixed(
                                  3,
                                ) ?? formatCalculationValue(frisanchoResult)}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {frisanchoDetails.ageRange?.label ??
                                  "Referencia adulta"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white/80 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Percentil
                              </p>
                              <p className="mt-2 text-2xl font-bold text-gray-900">
                                {frisanchoDetails.assessment?.percentileBand ??
                                  "--"}
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                ~P
                                {frisanchoDetails.assessment?.approximatePercentile?.toFixed(
                                  1,
                                ) ?? "--"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white/80 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Adecuacion
                              </p>
                              <p className="mt-2 text-2xl font-bold text-gray-900">
                                {frisanchoDetails.assessment?.adequacyPctOfP50?.toFixed(
                                  1,
                                ) ?? "--"}
                                %
                              </p>
                              <p className="mt-1 text-sm text-gray-500">
                                {frisanchoDetails.assessment?.classification ??
                                  "--"}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <p
                          className={`mt-3 text-xs font-medium uppercase tracking-[0.18em] ${
                            frisanchoResult.status === "computed"
                              ? "text-emerald-700"
                              : "text-amber-700"
                          }`}
                        >
                          Estado: {frisanchoResult.status}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const healthContent = (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto rounded-2xl border border-pink-100 bg-linear-to-br from-pink-50 via-white to-rose-50 p-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-pink-100 p-2 text-pink-600">
          <HeartPulse className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-lg font-bold text-gray-900">
            Biometría y Signos Vitales
          </h4>
          <p className="text-sm text-gray-500">
            Registra presión arterial, glucosa, frecuencia cardiaca y
            saturación.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-pink-500" />
            <h5 className="text-sm font-bold text-gray-800">Registro</h5>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className={fieldClassName}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Notas
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones clínicas, síntomas o contexto relevante"
                className={fieldClassName}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-pink-500" />
            <h5 className="text-sm font-bold text-gray-800">
              Presión y ritmo cardiaco
            </h5>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Sistólica"
              type="number"
              step="1"
              placeholder="120"
              value={systolicMmhg}
              onChange={(e) => setSystolicMmhg(e.target.value)}
              rightElement={
                <span className="mr-3 text-sm font-medium text-gray-400">
                  mmHg
                </span>
              }
            />
            <Input
              label="Diastólica"
              type="number"
              step="1"
              placeholder="80"
              value={diastolicMmhg}
              onChange={(e) => setDiastolicMmhg(e.target.value)}
              rightElement={
                <span className="mr-3 text-sm font-medium text-gray-400">
                  mmHg
                </span>
              }
            />
            <Input
              label="Frecuencia cardiaca"
              type="number"
              step="1"
              placeholder="68"
              value={heartRateBpm}
              onChange={(e) => setHeartRateBpm(e.target.value)}
              rightElement={
                <span className="mr-3 text-sm font-medium text-gray-400">
                  bpm
                </span>
              }
            />
            <Input
              label="Saturación de oxígeno"
              type="number"
              step="0.1"
              placeholder="98.5"
              value={oxygenSaturationPct}
              onChange={(e) => setOxygenSaturationPct(e.target.value)}
              rightElement={
                <span className="mr-3 text-sm font-medium text-gray-400">
                  %
                </span>
              }
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <h5 className="text-sm font-bold text-gray-800">Glucosa</h5>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              label="Glucosa"
              type="number"
              step="1"
              placeholder="95"
              value={glucoseMgDl}
              onChange={(e) => setGlucoseMgDl(e.target.value)}
              rightElement={
                <span className="mr-3 text-sm font-medium text-gray-400">
                  mg/dL
                </span>
              }
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Contexto
              </label>
              <select
                value={glucoseContext}
                onChange={(e) => setGlucoseContext(e.target.value)}
                className={fieldClassName}
              >
                <option value="ayuno">Ayuno</option>
                <option value="posprandial">Posprandial</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    setIsFullscreen(isOpen);
  }, [isOpen]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel
                className={`flex transform flex-col overflow-hidden border border-gray-100 bg-white p-8 text-left align-middle shadow-2xl transition-all ${
                  isFullscreen
                    ? "h-[96vh] w-[96vw] max-w-none rounded-[2.5rem]"
                    : "h-[80vh] w-full max-w-6xl rounded-[2.5rem]"
                }`}
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-gray-900">
                      {isHealthMode
                        ? "Agregar Nueva Métrica de Salud"
                        : isEditComposition
                          ? "Editar Medición"
                          : "Agregar Nueva Medición"}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                      {isHealthMode
                        ? "Captura biometría y signos vitales del paciente"
                        : isEditComposition
                          ? "Actualiza los valores capturados. Los resultados se volverán a calcular al guardar."
                          : "Registra composición corporal y antropometría"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFullscreen((current) => !current)}
                      className="cursor-pointer rounded-2xl p-2.5 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
                      aria-label={
                        isFullscreen
                          ? "Restaurar tamaño del modal"
                          : "Expandir modal a pantalla completa"
                      }
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-5 w-5" />
                      ) : (
                        <Maximize2 className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={onClose}
                      className="cursor-pointer rounded-2xl p-2.5 text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600"
                      aria-label="Cerrar modal"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {isHealthMode ? healthContent : compositionContent}

                <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6">
                  <button
                    onClick={handleClear}
                    disabled={isSaving}
                    className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isEditComposition ? "Restablecer" : "Limpiar"}
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      disabled={isSaving}
                      className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handlePrimaryAction}
                      disabled={isSaving}
                      className="cursor-pointer rounded-xl bg-nutrition-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-nutrition-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSaving
                        ? "Guardando..."
                        : isHealthMode
                          ? "Guardar Métrica"
                          : compositionPrimaryLabel}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
