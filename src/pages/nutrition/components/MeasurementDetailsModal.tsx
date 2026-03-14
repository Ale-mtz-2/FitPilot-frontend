import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  X,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { ClientMetric } from "@/services/client-metrics";
import {
  ClientHealthMetric,
  MeasurementCalculationStatus,
} from "@/features/client-history/types";
import { useMeasurementDetail } from "@/features/client-history/queries";
import { DatePicker } from "@/components/common/DatePicker";

export interface MeasurementRecordMetric {
  id: string;
  metric_type: ClientMetric["metric_type"];
  value: number | string;
  unit: string;
  date: string;
}

export interface MeasurementRecord {
  recordId: string;
  recordType: "measurement" | "health_metric";
  measurementId?: string;
  healthMetricId?: string;
  rawDate: string;
  metrics: MeasurementRecordMetric[];
}

interface MeasurementHistoryPoint {
  rawDate: string;
  date: string;
  fullDate: string;
  unit: string;
  value?: number;
  systolic?: number;
  diastolic?: number;
}

interface MeasurementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MeasurementRecord | null;
  historyMetrics: ClientMetric[];
  healthMetrics: ClientHealthMetric[];
}

type TimeFilter = "all" | "1d" | "1w" | "1m" | "custom";
type MeasurementDetailsTab = "measurements" | "calculations";
type MeasurementGroupId =
  | "composicion"
  | "segmental"
  | "perimetros"
  | "pliegues"
  | "diametros"
  | "salud"
  | "otros";
type CalculationSubsectionId =
  | "indicadores-antropometricos"
  | "peso-teorico"
  | "porcentaje-de-grasa"
  | "componentes-corporales"
  | "indicadores-de-frisancho";

type CalculationRow = {
  code: string;
  label: string;
  subsection: CalculationSubsectionId;
  value: number | null;
  unit: string | null;
  status: MeasurementCalculationStatus;
  method: string;
  formulaVersion: string;
  message?: string;
  missingFields?: string[];
};

type FrisanchoCalculationDetails = {
  ageRange?: { label?: string };
  measurements?: {
    relaxedArmMidpointCm?: number;
    tricepsFoldMm?: number;
  };
  derived?: {
    correctedArmMuscleAreaCm2?: number;
    armMuscleCircumferenceCm?: number;
  };
  assessment?: {
    percentileBand?: string;
    classification?: string;
    adequacyPctOfP50?: number;
    approximatePercentile?: number | null;
  };
};

type MeasurementGroupDefinition = {
  id: MeasurementGroupId;
  label: string;
  description: string;
};

type MeasurementCardItem = {
  metric: MeasurementRecordMetric;
  label: string;
  groupId: MeasurementGroupId;
  searchText: string;
};

const typeLabels: Record<ClientMetric["metric_type"], string> = {
  weight: "Peso",
  body_fat: "Grasa Corporal",
  upper_body_fat: "Grasa Corporal Superior",
  lower_body_fat: "Grasa Corporal Inferior",
  fat_free_mass: "Masa Libre de Grasa",
  muscle_mass: "Masa Muscular",
  bone_mass: "Masa Osea",
  body_water: "Agua Corporal",
  metabolic_age: "Edad Metabolica",
  visceral_fat: "Grasa Visceral",
  waist: "Cintura",
  hips: "Cadera",
  blood_pressure: "Presion Arterial",
  glucose: "Glucosa",
  chest: "Pecho",
  cephalic: "Cefalico",
  neck: "Cuello",
  mesosternal: "Mesoesternal",
  umbilical: "Umbilical",
  biacromial: "Biacromial",
  biiliocrestal: "Biiliocrestal",
  foot_length: "Longitud del Pie",
  thorax_transverse: "Transverso del Torax",
  thorax_anteroposterior: "Anteroposterior del Torax",
  humerus_biepicondylar: "Humero",
  wrist_bistyloid: "Biestiloideo de la Muneca",
  femur_biepicondylar: "Femur",
  bimaleolar: "Bimaleolar",
  foot_transverse: "Transverso del Pie",
  hand_length: "Longitud de la Mano",
  hand_transverse: "Transverso de la Mano",
  arm_left: "Brazo Izquierdo",
  arm_right: "Brazo Derecho",
  relaxed_arm_midpoint: "Mitad del Brazo Relajado",
  contracted_arm_midpoint: "Mitad del Brazo Contraido",
  forearm: "Antebrazo",
  wrist: "Muneca",
  thigh_left: "Muslo Izquierdo",
  thigh_right: "Muslo Derecho",
  mid_thigh: "Muslo Medio",
  calf: "Pantorrilla",
  calf_left: "Pantorrilla Izquierda",
  calf_right: "Pantorrilla Derecha",
  subscapular_fold: "Subescapular",
  triceps_fold: "Triceps",
  biceps_fold: "Biceps",
  iliac_crest_fold: "Cresta Iliaca",
  supraspinal_fold: "Supraespinal",
  abdominal_fold: "Abdominal",
  front_thigh_fold: "Muslo Frontal",
  medial_calf_fold: "Pantorrilla Medial",
  mid_axillary_fold: "Axilar Medial",
  pectoral_fold: "Pectoral",
  arms: "Brazos",
  thighs: "Muslos",
  calves: "Pantorrillas",
  systolic: "Sistolica",
  diastolic: "Diastolica",
  heart_rate: "Frecuencia Cardiaca",
  oxygen_saturation: "Saturacion de Oxigeno",
};

const metricColors: Partial<Record<ClientMetric["metric_type"], string>> = {
  weight: "#0f766e",
  body_fat: "#2563eb",
  upper_body_fat: "#60a5fa",
  lower_body_fat: "#1d4ed8",
  fat_free_mass: "#8b5cf6",
  muscle_mass: "#7c3aed",
  bone_mass: "#a78bfa",
  body_water: "#06b6d4",
  metabolic_age: "#f59e0b",
  visceral_fat: "#ea580c",
  waist: "#0f766e",
  hips: "#0f766e",
  chest: "#0f766e",
  cephalic: "#0f766e",
  neck: "#0f766e",
  mesosternal: "#0f766e",
  umbilical: "#0f766e",
  biacromial: "#0f766e",
  biiliocrestal: "#0f766e",
  foot_length: "#0f766e",
  thorax_transverse: "#0f766e",
  thorax_anteroposterior: "#0f766e",
  humerus_biepicondylar: "#0f766e",
  wrist_bistyloid: "#0f766e",
  femur_biepicondylar: "#0f766e",
  bimaleolar: "#0f766e",
  foot_transverse: "#0f766e",
  hand_length: "#0f766e",
  hand_transverse: "#0f766e",
  arm_left: "#0f766e",
  arm_right: "#0f766e",
  relaxed_arm_midpoint: "#0f766e",
  contracted_arm_midpoint: "#0f766e",
  forearm: "#0f766e",
  wrist: "#0f766e",
  thigh_left: "#0f766e",
  thigh_right: "#0f766e",
  mid_thigh: "#0f766e",
  calf: "#0f766e",
  calf_left: "#0f766e",
  calf_right: "#0f766e",
  glucose: "#0284c7",
  heart_rate: "#e11d48",
  oxygen_saturation: "#0891b2",
};

const measurementGroupDefinitions: MeasurementGroupDefinition[] = [
  {
    id: "composicion",
    label: "Composicion corporal",
    description: "Peso y resultados generales de composicion corporal.",
  },
  {
    id: "segmental",
    label: "Composicion segmental",
    description: "Distribucion corporal por zonas o segmentos.",
  },
  {
    id: "perimetros",
    label: "Perimetros",
    description: "Circunferencias corporales y medidas lineales.",
  },
  {
    id: "pliegues",
    label: "Pliegues",
    description: "Pliegues cutaneos registrados en la medicion.",
  },
  {
    id: "diametros",
    label: "Diametros",
    description: "Diametros oseos y anchos corporales.",
  },
  {
    id: "salud",
    label: "Salud",
    description: "Biometria y signos vitales del registro.",
  },
  {
    id: "otros",
    label: "Otros",
    description: "Mediciones adicionales registradas en esta fecha.",
  },
];

const normalizeSearchValue = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getMeasurementGroupId = (
  metricType: ClientMetric["metric_type"],
): MeasurementGroupId => {
  switch (metricType) {
    case "weight":
    case "body_fat":
    case "fat_free_mass":
    case "muscle_mass":
    case "bone_mass":
    case "body_water":
    case "metabolic_age":
    case "visceral_fat":
      return "composicion";
    case "upper_body_fat":
    case "lower_body_fat":
    case "arms":
    case "thighs":
    case "calves":
      return "segmental";
    case "waist":
    case "hips":
    case "chest":
    case "cephalic":
    case "neck":
    case "mesosternal":
    case "umbilical":
    case "foot_length":
    case "hand_length":
    case "arm_left":
    case "arm_right":
    case "relaxed_arm_midpoint":
    case "contracted_arm_midpoint":
    case "forearm":
    case "wrist":
    case "thigh_left":
    case "thigh_right":
    case "mid_thigh":
    case "calf":
    case "calf_left":
    case "calf_right":
      return "perimetros";
    case "subscapular_fold":
    case "triceps_fold":
    case "biceps_fold":
    case "iliac_crest_fold":
    case "supraspinal_fold":
    case "abdominal_fold":
    case "front_thigh_fold":
    case "medial_calf_fold":
    case "mid_axillary_fold":
    case "pectoral_fold":
      return "pliegues";
    case "biacromial":
    case "biiliocrestal":
    case "thorax_transverse":
    case "thorax_anteroposterior":
    case "humerus_biepicondylar":
    case "wrist_bistyloid":
    case "femur_biepicondylar":
    case "bimaleolar":
    case "foot_transverse":
    case "hand_transverse":
      return "diametros";
    case "blood_pressure":
    case "glucose":
    case "heart_rate":
    case "oxygen_saturation":
    case "systolic":
    case "diastolic":
      return "salud";
    default:
      return "otros";
  }
};

const calculationSubsections: Array<{
  id: CalculationSubsectionId;
  label: string;
  helperText: string;
}> = [
  {
    id: "indicadores-antropometricos",
    label: "Indicadores antropometricos",
    helperText:
      "Indicadores clinicos derivados de peso, cintura, cadera y estatura.",
  },
  {
    id: "peso-teorico",
    label: "Peso teorico",
    helperText: "Estimaciones relacionadas con peso objetivo.",
  },
  {
    id: "porcentaje-de-grasa",
    label: "Porcentaje de grasa",
    helperText:
      "Resultado almacenado para composicion corporal al momento de guardar.",
  },
  {
    id: "componentes-corporales",
    label: "Componentes corporales",
    helperText: "Desglose de masa grasa y masa libre de grasa.",
  },
  {
    id: "indicadores-de-frisancho",
    label: "Indicadores de Frisancho",
    helperText:
      "Indicadores antropometricos de referencia guardados en el run.",
  },
];

const defaultCalculationSubsection = calculationSubsections[0].id;

const calculationMeta: Record<
  string,
  { label: string; subsection: CalculationSubsectionId; order: number }
> = {
  bmi: {
    label: "Indice de masa corporal",
    subsection: "indicadores-antropometricos",
    order: 1,
  },
  waist_hip_ratio: {
    label: "Indice cintura-cadera",
    subsection: "indicadores-antropometricos",
    order: 2,
  },
  waist_height_ratio: {
    label: "Indice cintura-estatura",
    subsection: "indicadores-antropometricos",
    order: 3,
  },
  ideal_weight_robinson: {
    label: "Robinson",
    subsection: "peso-teorico",
    order: 1,
  },
  ideal_weight_metropolitan: {
    label: "Metropolitan",
    subsection: "peso-teorico",
    order: 2,
  },
  ideal_weight_hamwi: {
    label: "Hamwi",
    subsection: "peso-teorico",
    order: 3,
  },
  ideal_weight_lorentz: {
    label: "Lorentz",
    subsection: "peso-teorico",
    order: 4,
  },
  ideal_weight_traditional: {
    label: "Tradicional",
    subsection: "peso-teorico",
    order: 5,
  },
  body_fat_pct_bioimpedance: {
    label: "Bioimpedancia",
    subsection: "porcentaje-de-grasa",
    order: 1,
  },
  fat_mass_kg: {
    label: "Masa grasa",
    subsection: "componentes-corporales",
    order: 1,
  },
  lean_mass_kg: {
    label: "Masa libre de grasa",
    subsection: "componentes-corporales",
    order: 2,
  },
  frisancho_indicators: {
    label: "Referencias Frisancho",
    subsection: "indicadores-de-frisancho",
    order: 1,
  },
};

const parseMetricDate = (dateValue: string) => {
  const datePart = dateValue.split("T")[0];
  return new Date(`${datePart}T00:00:00`);
};

const formatMetricValue = (value: number | string) => {
  if (typeof value !== "number") return value;
  return value % 1 !== 0 ? value.toFixed(1) : value.toString();
};

const formatCalculationValue = (value: number | null) => {
  if (value === null) return "--";
  return value % 1 !== 0
    ? value.toFixed(value >= 10 ? 1 : 2)
    : value.toString();
};

const formatCalculationMethod = (method: string) =>
  method
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDeltaFromPatient = (value: number | null) => {
  if (value === null) return "Sin referencia";
  if (value === 0) return "Coincide con el peso actual";

  return `${value > 0 ? "+" : ""}${formatCalculationValue(value)} kg vs peso actual`;
};

const getStatusLabel = (status: MeasurementCalculationStatus) => {
  if (status === "computed") return "Calculado";
  if (status === "error") return "Error";
  return "Pendiente";
};

const getStatusClassName = (status: MeasurementCalculationStatus) => {
  if (status === "computed") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  }
  if (status === "error") {
    return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
  }
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100";
};

const humanizeMissingField = (field: string) => {
  const fieldLabels: Record<string, string> = {
    weight_kg: "Peso",
    height_cm: "Estatura",
    body_fat_pct: "Grasa corporal",
    waist_cm: "Cintura",
    hip_cm: "Cadera",
    relaxed_arm_midpoint_cm: "Brazo relajado",
    triceps_fold_mm: "Pliegue tricipital",
    genre: "Genero",
    age_years: "Edad",
  };

  return fieldLabels[field] ?? field.replace(/_/g, " ");
};

export function MeasurementDetailsModal({
  isOpen,
  onClose,
  record,
  historyMetrics,
  healthMetrics,
}: MeasurementDetailsModalProps) {
  const [selectedMetric, setSelectedMetric] =
    useState<MeasurementRecordMetric | null>(null);
  const [activeTab, setActiveTab] =
    useState<MeasurementDetailsTab>("measurements");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [measurementSearchQuery, setMeasurementSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [activeCalculationSubsection, setActiveCalculationSubsection] =
    useState<CalculationSubsectionId>(defaultCalculationSubsection);
  const deferredMeasurementSearchQuery = useDeferredValue(
    measurementSearchQuery,
  );

  const measurementId = record?.measurementId;
  const {
    data: measurementDetail,
    isLoading: isMeasurementLoading,
    isError: isMeasurementError,
  } = useMeasurementDetail(measurementId, isOpen && !!measurementId);

  const calculationRows = useMemo<CalculationRow[]>(() => {
    if (!measurementDetail) return [];

    const warningsByCalculation = new Map(
      measurementDetail.warnings.map((warning) => [
        warning.calculation,
        warning,
      ]),
    );

    return Object.entries(measurementDetail.calculations)
      .map(([code, calculation]) => {
        const meta = calculationMeta[code] ?? {
          label: code.replace(/_/g, " "),
          subsection: "componentes-corporales" as CalculationSubsectionId,
          order: 999,
        };
        const warning = warningsByCalculation.get(code);

        return {
          code,
          label: meta.label,
          subsection: meta.subsection,
          value: calculation.value,
          unit: calculation.unit,
          status: calculation.status,
          method: calculation.method,
          formulaVersion: calculation.formulaVersion,
          message: warning?.message,
          missingFields:
            warning?.missingFields ??
            measurementDetail.missingFieldsByCalculation[code],
        };
      })
      .sort((left, right) => {
        const leftMeta = calculationMeta[left.code];
        const rightMeta = calculationMeta[right.code];
        const leftOrder = leftMeta?.order ?? 999;
        const rightOrder = rightMeta?.order ?? 999;

        if (left.subsection === right.subsection) {
          return leftOrder - rightOrder;
        }

        return (
          calculationSubsections.findIndex(
            (section) => section.id === left.subsection,
          ) -
          calculationSubsections.findIndex(
            (section) => section.id === right.subsection,
          )
        );
      });
  }, [measurementDetail]);

  const calculationRowsBySubsection = useMemo(() => {
    const grouped = Object.fromEntries(
      calculationSubsections.map((section) => [
        section.id,
        [] as CalculationRow[],
      ]),
    ) as Record<CalculationSubsectionId, CalculationRow[]>;

    calculationRows.forEach((row) => {
      grouped[row.subsection].push(row);
    });

    return grouped;
  }, [calculationRows]);

  const availableCalculationSections = useMemo(
    () =>
      calculationSubsections.filter(
        (section) => calculationRowsBySubsection[section.id].length > 0,
      ),
    [calculationRowsBySubsection],
  );

  const measurementCards = useMemo<MeasurementCardItem[]>(
    () =>
      (record?.metrics ?? []).map((metric) => {
        const label = typeLabels[metric.metric_type] || metric.metric_type;

        return {
          metric,
          label,
          groupId: getMeasurementGroupId(metric.metric_type),
          searchText: normalizeSearchValue(
            `${label} ${metric.metric_type} ${metric.unit ?? ""}`,
          ),
        };
      }),
    [record?.metrics],
  );

  const normalizedMeasurementSearch = useMemo(
    () => normalizeSearchValue(deferredMeasurementSearchQuery),
    [deferredMeasurementSearchQuery],
  );

  const measurementGroups = useMemo(
    () =>
      measurementGroupDefinitions
        .map((group) => ({
          ...group,
          metrics: measurementCards.filter(
            (item) =>
              item.groupId === group.id &&
              (!normalizedMeasurementSearch ||
                item.searchText.includes(normalizedMeasurementSearch)),
          ),
        }))
        .filter((group) => group.metrics.length > 0),
    [measurementCards, normalizedMeasurementSearch],
  );

  const visibleMeasurementCount = measurementGroups.reduce(
    (total, group) => total + group.metrics.length,
    0,
  );

  useEffect(() => {
    setIsFullscreen(isOpen);

    if (!isOpen) {
      setSelectedMetric(null);
      setActiveTab("measurements");
      setHoveredDate(null);
      setTimeFilter("all");
      setCustomStartDate("");
      setCustomEndDate("");
      setMeasurementSearchQuery("");
      setActiveCalculationSubsection(defaultCalculationSubsection);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedMetric(null);
    setActiveTab("measurements");
    setHoveredDate(null);
    setTimeFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setMeasurementSearchQuery("");
    setIsFullscreen(true);
    setActiveCalculationSubsection(defaultCalculationSubsection);
  }, [record?.measurementId, record?.rawDate]);

  useEffect(() => {
    if (availableCalculationSections.length === 0) {
      if (activeCalculationSubsection !== defaultCalculationSubsection) {
        setActiveCalculationSubsection(defaultCalculationSubsection);
      }
      return;
    }

    if (
      !availableCalculationSections.some(
        (section) => section.id === activeCalculationSubsection,
      )
    ) {
      setActiveCalculationSubsection(availableCalculationSections[0].id);
    }
  }, [activeCalculationSubsection, availableCalculationSections]);

  if (!record) return null;

  const selectedMetricLabel = selectedMetric
    ? typeLabels[selectedMetric.metric_type] || selectedMetric.metric_type
    : "";
  const selectedDate = format(
    parseMetricDate(record.rawDate),
    "dd 'de' MMMM, yyyy",
    { locale: es },
  );
  const selectedDateKey = format(parseMetricDate(record.rawDate), "yyyy-MM-dd");

  const buildSingleMetricHistory = (
    metricType: ClientMetric["metric_type"],
  ) => {
    const metricsByDate = new Map<string, MeasurementHistoryPoint>();
    const sourceMetrics =
      metricType === "glucose"
        ? healthMetrics
            .filter((metric) => metric.glucose_mg_dl !== null)
            .map((metric) => ({
              date: metric.recorded_at,
              value: metric.glucose_mg_dl as number,
              unit: "mg/dL",
            }))
        : metricType === "heart_rate"
          ? healthMetrics
              .filter((metric) => metric.heart_rate_bpm !== null)
              .map((metric) => ({
                date: metric.recorded_at,
                value: metric.heart_rate_bpm as number,
                unit: "bpm",
              }))
          : metricType === "oxygen_saturation"
            ? healthMetrics
                .filter((metric) => metric.oxygen_saturation_pct !== null)
                .map((metric) => ({
                  date: metric.recorded_at,
                  value: Number(metric.oxygen_saturation_pct),
                  unit: "%",
                }))
            : historyMetrics
                .filter((metric) => metric.metric_type === metricType)
                .map((metric) => ({
                  date: metric.date,
                  value: metric.value,
                  unit: metric.unit,
                }));

    sourceMetrics
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((metric) => {
        const localDate = parseMetricDate(metric.date);
        const dateKey = format(localDate, "yyyy-MM-dd");

        metricsByDate.set(dateKey, {
          rawDate: dateKey,
          date: format(localDate, "dd MMM", { locale: es }),
          fullDate: format(localDate, "dd 'de' MMMM, yyyy", { locale: es }),
          value: metric.value,
          unit: metric.unit,
        });
      });

    return Array.from(metricsByDate.values()).sort((a, b) =>
      a.rawDate.localeCompare(b.rawDate),
    );
  };

  const buildBloodPressureHistory = () => {
    const metricsByDate = new Map<string, MeasurementHistoryPoint>();

    healthMetrics
      .filter(
        (metric) =>
          metric.systolic_mmhg !== null && metric.diastolic_mmhg !== null,
      )
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime(),
      )
      .forEach((metric) => {
        const localDate = parseMetricDate(metric.recorded_at);
        const dateKey = format(localDate, "yyyy-MM-dd");

        metricsByDate.set(dateKey, {
          rawDate: dateKey,
          date: format(localDate, "dd MMM", { locale: es }),
          fullDate: format(localDate, "dd 'de' MMMM, yyyy", { locale: es }),
          systolic: metric.systolic_mmhg ?? undefined,
          diastolic: metric.diastolic_mmhg ?? undefined,
          unit: "mmHg",
        });
      });

    return Array.from(metricsByDate.values()).sort((a, b) =>
      a.rawDate.localeCompare(b.rawDate),
    );
  };

  const metricHistory = selectedMetric
    ? selectedMetric.metric_type === "blood_pressure"
      ? buildBloodPressureHistory()
      : buildSingleMetricHistory(selectedMetric.metric_type)
    : [];

  const filteredMetricHistory = (() => {
    if (metricHistory.length === 0) return [];

    if (timeFilter === "custom") {
      return metricHistory.filter((point) => {
        const matchesStart =
          !customStartDate || point.rawDate >= customStartDate;
        const matchesEnd = !customEndDate || point.rawDate <= customEndDate;
        return matchesStart && matchesEnd;
      });
    }

    if (timeFilter === "all") return metricHistory;

    const latestPointDate = parseMetricDate(
      metricHistory[metricHistory.length - 1].rawDate,
    );
    const daysBack = timeFilter === "1d" ? 0 : timeFilter === "1w" ? 6 : 29;
    const startDate = subDays(latestPointDate, daysBack);

    return metricHistory.filter((point) => {
      const pointDate = parseMetricDate(point.rawDate);
      return pointDate >= startDate && pointDate <= latestPointDate;
    });
  })();

  const chartColor = selectedMetric
    ? metricColors[selectedMetric.metric_type] || "#0f766e"
    : "#0f766e";

  const activeCalculationSection =
    calculationSubsections.find(
      (section) => section.id === activeCalculationSubsection,
    ) ?? calculationSubsections[0];
  const activeCalculationRows =
    calculationRowsBySubsection[activeCalculationSubsection] ?? [];
  const frisanchoDetails = (measurementDetail?.calculations[
    "frisancho_indicators"
  ]?.details ?? null) as FrisanchoCalculationDetails | null;
  const idealWeightComparisonChart =
    measurementDetail?.charts.idealWeightComparison ?? null;

  const renderCalculationRowMessage = (row: CalculationRow) => {
    if (row.missingFields && row.missingFields.length > 0) {
      return `Faltantes: ${row.missingFields
        .map((field) => humanizeMissingField(field))
        .join(", ")}`;
    }

    return row.message ?? `Metodo ${formatCalculationMethod(row.method)}`;
  };

  const renderTableRows = (rows: CalculationRow[]) => (
    <div className="mt-5 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
      <div className="grid grid-cols-[1.4fr_0.9fr_auto] border-b border-gray-100 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Calculo
        </p>
        <p className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Resultado
        </p>
        <p className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Estado
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div
            key={row.code}
            className="grid grid-cols-[1.4fr_0.9fr_auto] items-center gap-3 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-700">{row.label}</p>
              <p className="mt-1 text-xs text-gray-400">
                {formatCalculationMethod(row.method)}
              </p>
            </div>
            <p className="text-right text-sm font-semibold text-gray-900">
              {formatCalculationValue(row.value)}
              {row.unit ? (
                <span className="ml-1 text-xs font-medium text-gray-400">
                  {row.unit}
                </span>
              ) : null}
            </p>
            <div className="flex justify-end">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClassName(row.status)}`}
              >
                {getStatusLabel(row.status)}
              </span>
            </div>
            <div className="col-span-3 text-xs text-gray-500">
              {renderCalculationRowMessage(row)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCalculationCard = (row: CalculationRow) => (
    <div
      key={row.code}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{row.label}</p>
          <p className="mt-1 text-xs text-gray-400">
            {formatCalculationMethod(row.method)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClassName(row.status)}`}
        >
          {getStatusLabel(row.status)}
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-2xl font-semibold text-gray-950">
          {formatCalculationValue(row.value)}
        </span>
        {row.unit ? (
          <span className="pb-0.5 text-sm font-medium text-gray-400">
            {row.unit}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {renderCalculationRowMessage(row)}
      </p>
      <p className="mt-2 text-xs text-gray-400">Formula {row.formulaVersion}</p>
    </div>
  );

  const renderIdealWeightComparisonChart = () => {
    if (
      !idealWeightComparisonChart ||
      idealWeightComparisonChart.entries.length === 0
    ) {
      return null;
    }

    const chartMaxValue = Math.max(
      ...idealWeightComparisonChart.entries.map((entry) => entry.value),
    );

    return (
      <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Comparacion visual
          </p>
          <h6 className="mt-1 text-lg font-semibold text-gray-950">
            Peso del paciente vs pesos teoricos
          </h6>
          <p className="mt-1 text-sm text-gray-600">
            La barra verde marca el peso actual y las barras grises muestran
            cada estimacion teorica guardada.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-[minmax(0,1.7fr)_240px]">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={idealWeightComparisonChart.entries}
                layout="vertical"
                margin={{ top: 8, right: 24, bottom: 8, left: 12 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="#e5e7eb"
                  strokeDasharray="4 4"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  domain={[0, Math.ceil(chartMaxValue * 1.15)]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  width={110}
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]
                      .payload as (typeof idealWeightComparisonChart.entries)[number];

                    return (
                      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
                        <p className="text-sm font-semibold text-gray-900">
                          {point.label}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          {formatCalculationValue(point.value)}{" "}
                          {idealWeightComparisonChart.unit}
                        </p>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                          {point.kind === "patient"
                            ? "Peso registrado en esta medicion"
                            : formatDeltaFromPatient(point.deltaFromPatient)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={22}>
                  {idealWeightComparisonChart.entries.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={entry.kind === "patient" ? "#0f766e" : "#cbd5e1"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Peso actual
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {formatCalculationValue(
                  idealWeightComparisonChart.patientWeight,
                )}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {idealWeightComparisonChart.unit}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Promedio teorico
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {formatCalculationValue(
                  idealWeightComparisonChart.theoreticalWeightAverage,
                )}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {idealWeightComparisonChart.unit}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Rango teorico
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-950">
                {idealWeightComparisonChart.theoreticalWeightRange
                  ? `${formatCalculationValue(idealWeightComparisonChart.theoreticalWeightRange.min)}-${formatCalculationValue(idealWeightComparisonChart.theoreticalWeightRange.max)}`
                  : "--"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {idealWeightComparisonChart.unit}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderActiveCalculationContent = () => {
    if (activeCalculationRows.length === 0) {
      return (
        <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          No hay resultados guardados en esta subseccion.
        </div>
      );
    }

    if (activeCalculationSubsection === "peso-teorico") {
      return (
        <>
          {renderIdealWeightComparisonChart()}
          {renderTableRows(activeCalculationRows)}
        </>
      );
    }

    if (activeCalculationSubsection === "porcentaje-de-grasa") {
      return renderTableRows(activeCalculationRows);
    }

    if (activeCalculationSubsection === "indicadores-de-frisancho") {
      const row = activeCalculationRows[0];
      return (
        <div
          className={`mt-5 rounded-2xl border p-5 ${
            row.status === "computed"
              ? "border-emerald-100 bg-emerald-50/60"
              : "border-amber-100 bg-amber-50/60"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`rounded-full bg-white p-2 ${
                row.status === "computed"
                  ? "text-emerald-600"
                  : "text-amber-600"
              }`}
            >
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="w-full">
              <p className="text-sm font-semibold text-gray-900">{row.label}</p>
              <p className="mt-1 text-sm text-gray-600">
                {renderCalculationRowMessage(row)}
              </p>
              {row.status === "computed" && frisanchoDetails ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      cAMA
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-950">
                      {frisanchoDetails.derived?.correctedArmMuscleAreaCm2?.toFixed(
                        3,
                      ) ?? formatCalculationValue(row.value)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {row.unit ?? "cm2"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Percentil
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-950">
                      {frisanchoDetails.assessment?.percentileBand ?? "--"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      ~P
                      {frisanchoDetails.assessment?.approximatePercentile?.toFixed(
                        1,
                      ) ?? "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Adecuacion
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-950">
                      {frisanchoDetails.assessment?.adequacyPctOfP50?.toFixed(
                        1,
                      ) ?? "--"}
                      %
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      vs P50 del grupo
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Clasificacion
                    </p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {frisanchoDetails.assessment?.classification ?? "--"}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {frisanchoDetails.ageRange?.label ?? "Referencia adulta"}
                    </p>
                  </div>
                </div>
              ) : null}
              {row.status === "computed" && frisanchoDetails ? (
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Medidas usadas
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      Brazo relajado:{" "}
                      {frisanchoDetails.measurements?.relaxedArmMidpointCm ??
                        "--"}{" "}
                      cm
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      Pliegue tricipital:{" "}
                      {frisanchoDetails.measurements?.tricepsFoldMm ?? "--"} mm
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Derivados
                    </p>
                    <p className="mt-2 text-sm text-gray-700">
                      Circunferencia muscular:{" "}
                      {frisanchoDetails.derived?.armMuscleCircumferenceCm?.toFixed(
                        3,
                      ) ?? "--"}{" "}
                      cm
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusClassName(row.status)}`}
                >
                  {getStatusLabel(row.status)}
                </span>
                <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-gray-500 ring-1 ring-gray-200">
                  Formula {row.formulaVersion}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
        {activeCalculationRows.map((row) => renderCalculationCard(row))}
      </div>
    );
  };

  const calculationOverviewContent = (() => {
    if (!measurementId) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Las metricas de salud no generan este bloque de calculos.
        </div>
      );
    }

    if (isMeasurementLoading) {
      return (
        <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando calculos guardados...
          </div>
        </div>
      );
    }

    if (isMeasurementError) {
      return (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-8 text-center text-sm text-rose-700">
          No se pudo cargar el detalle de calculos para este registro.
        </div>
      );
    }

    if (availableCalculationSections.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
          Este registro no tiene calculos guardados.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-1">
          {calculationSubsections.map((section) => {
            const hasRows = calculationRowsBySubsection[section.id].length > 0;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  hasRows && setActiveCalculationSubsection(section.id)
                }
                disabled={!hasRows}
                className={`w-full rounded-xl px-4 py-2 text-left text-sm font-medium transition-colors ${
                  activeCalculationSubsection === section.id
                    ? "border border-nutrition-100 bg-nutrition-50 text-nutrition-700"
                    : hasRows
                      ? "text-gray-600 hover:bg-gray-50"
                      : "cursor-not-allowed text-gray-300"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
            Subseccion activa
          </div>
          <h5 className="text-xl font-bold text-gray-900">
            {activeCalculationSection.label}
          </h5>
          <p className="mt-2 text-sm text-gray-500">
            {activeCalculationSection.helperText}
          </p>
          {renderActiveCalculationContent()}
        </div>
      </div>
    );
  })();

  const measurementsOverviewSection = (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Selecciona una medicion para ver su grafica e historial completo.
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={measurementSearchQuery}
              onChange={(event) =>
                setMeasurementSearchQuery(event.target.value)
              }
              placeholder="Buscar medicion por nombre"
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-nutrition-400 focus:outline-none focus:ring-2 focus:ring-nutrition-300/40"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-nutrition-50 px-3 py-1.5 text-nutrition-700">
              {visibleMeasurementCount} medicion
              {visibleMeasurementCount === 1 ? "" : "es"} visibles
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-gray-600">
              {measurementGroups.length} grupo
              {measurementGroups.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {visibleMeasurementCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-5 py-10 text-center">
          <p className="text-sm font-semibold text-gray-700">
            No se encontraron mediciones con ese criterio.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Prueba con otra palabra, sin importar mayusculas o acentos.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {measurementGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-[28px] border border-gray-200 bg-gray-50/70 p-4 sm:p-5"
            >
              <div className="mb-4 flex flex-col gap-2 border-b border-gray-200/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-gray-950">
                    {group.label}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {group.description}
                  </p>
                </div>
                <span className="inline-flex w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                  {group.metrics.length} medicion
                  {group.metrics.length === 1 ? "" : "es"}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.metrics.map((item) => (
                  <button
                    key={item.metric.id}
                    type="button"
                    onClick={() => {
                      setSelectedMetric(item.metric);
                      setHoveredDate(null);
                      setTimeFilter("all");
                      setCustomStartDate("");
                      setCustomEndDate("");
                    }}
                    className="flex min-h-[116px] flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300"
                  >
                    <span className="text-sm font-medium text-gray-500">
                      {item.label}
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-semibold text-gray-950">
                        {formatMetricValue(item.metric.value)}
                      </span>
                      {item.metric.unit ? (
                        <span className="text-sm font-medium text-gray-400">
                          {item.metric.unit}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  const calculationsOverviewSection = (
    <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-nutrition-100 p-2.5 text-nutrition-600">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
              Calculos guardados
            </p>
            <h4 className="mt-1 text-lg font-semibold text-gray-950">
              Resumen analitico
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              Resultados generados cuando se guardo esta medicion.
            </p>
          </div>
        </div>

        {measurementDetail?.calculationRun ? (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600">
              Motor {measurementDetail.calculationRun.engineVersion}
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
              {measurementDetail.calculationRun.status === "completed"
                ? "Completado"
                : measurementDetail.calculationRun.status === "partial"
                  ? "Parcial"
                  : measurementDetail.calculationRun.status}
            </span>
          </div>
        ) : null}
      </div>

      {calculationOverviewContent}
    </section>
  );

  const overviewContent = (
    <>
      <div className="flex-1 overflow-y-auto bg-gray-50/60 px-5 py-5 sm:px-6 sm:py-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { id: "measurements", label: "Mediciones" },
            { id: "calculations", label: "Calculos guardados" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as MeasurementDetailsTab)}
              aria-pressed={activeTab === tab.id}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300 ${
                activeTab === tab.id
                  ? "bg-nutrition-600 text-white"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "measurements"
          ? measurementsOverviewSection
          : calculationsOverviewSection}
      </div>

      <div className="flex shrink-0 justify-end border-t border-gray-100 bg-white px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300"
        >
          Cerrar detalle
        </button>
      </div>
    </>
  );

  const detailContent = (
    <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden bg-gray-50/60 p-4 sm:grid-cols-[minmax(0,1.8fr)_minmax(280px,360px)] sm:p-6">
      <section className="flex min-h-0 flex-col rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Registro seleccionado
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-3xl font-semibold text-gray-950">
              <span>{formatMetricValue(selectedMetric?.value ?? "")}</span>
              {selectedMetric?.unit ? (
                <span className="text-base font-medium text-gray-400">
                  {selectedMetric.unit}
                </span>
              ) : null}
            </p>
          </div>

          <div className="inline-flex rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
            {selectedDate}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Todo" },
              { id: "1d", label: "1 dia" },
              { id: "1w", label: "1 semana" },
              { id: "1m", label: "1 mes" },
              { id: "custom", label: "Rango" },
            ].map((filterOption) => (
              <button
                key={filterOption.id}
                type="button"
                onClick={() => setTimeFilter(filterOption.id as TimeFilter)}
                aria-pressed={timeFilter === filterOption.id}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300 ${
                  timeFilter === filterOption.id
                    ? "bg-nutrition-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filterOption.label}
              </button>
            ))}
          </div>

          {timeFilter === "custom" ? (
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <DatePicker
                label="Desde"
                value={customStartDate}
                onChange={setCustomStartDate}
                maxDate={customEndDate || undefined}
              />
              <DatePicker
                label="Hasta"
                value={customEndDate}
                onChange={setCustomEndDate}
                minDate={customStartDate || undefined}
              />
            </div>
          ) : null}
        </div>

        <div className="min-h-[320px] flex-1">
          {filteredMetricHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {selectedMetric?.metric_type === "blood_pressure" ? (
                <AreaChart data={filteredMetricHistory}>
                  <defs>
                    <linearGradient
                      id="pressureSystolic"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#ef4444"
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#eef2f7"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={48}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip
                    cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]
                        .payload as MeasurementHistoryPoint;
                      return (
                        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            {point.fullDate}
                          </p>
                          <div className="mt-2 space-y-1 text-sm">
                            <p className="font-semibold text-red-500">
                              Sistolica: {point.systolic} mmHg
                            </p>
                            <p className="font-semibold text-orange-500">
                              Diastolica: {point.diastolic} mmHg
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="systolic"
                    stroke="#ef4444"
                    fill="url(#pressureSystolic)"
                    strokeWidth={3}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5 }}
                  />
                  {hoveredDate ? (
                    <ReferenceLine
                      x={hoveredDate}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                  ) : null}
                </AreaChart>
              ) : (
                <AreaChart data={filteredMetricHistory}>
                  <defs>
                    <linearGradient
                      id="measurementHistoryFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={chartColor}
                        stopOpacity={0.18}
                      />
                      <stop
                        offset="95%"
                        stopColor={chartColor}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#eef2f7"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={48}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0]
                        .payload as MeasurementHistoryPoint;
                      return (
                        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                            {point.fullDate}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900">
                            {formatMetricValue(point.value ?? 0)} {point.unit}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    fill="url(#measurementHistoryFill)"
                    strokeWidth={3}
                    activeDot={{ r: 5 }}
                  />
                  {hoveredDate ? (
                    <ReferenceLine
                      x={hoveredDate}
                      stroke="#cbd5e1"
                      strokeDasharray="4 4"
                    />
                  ) : null}
                </AreaChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-gray-200 bg-gray-50 px-6 text-center text-sm text-gray-500">
              {metricHistory.length === 0
                ? "No hay historial suficiente para graficar esta medicion."
                : "No hay registros dentro del rango seleccionado."}
            </div>
          )}
        </div>
      </section>

      <aside className="flex min-h-0 flex-col rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 border-b border-gray-100 pb-4">
          <h4 className="text-sm font-semibold text-gray-900">
            Historial de registros
          </h4>
          <p className="mt-1 text-xs text-gray-500">
            {filteredMetricHistory.length} registro
            {filteredMetricHistory.length === 1 ? "" : "s"} en el filtro actual.
          </p>
        </div>

        <div className="space-y-2 overflow-y-auto pr-1">
          {filteredMetricHistory.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              No hay registros para las fechas seleccionadas.
            </div>
          ) : (
            [...filteredMetricHistory].reverse().map((point) => {
              const isSelectedDate = point.rawDate === selectedDateKey;

              return (
                <div
                  key={`${selectedMetric?.metric_type}-${point.rawDate}`}
                  onMouseEnter={() => setHoveredDate(point.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={`rounded-2xl border px-4 py-3 transition-colors ${
                    isSelectedDate
                      ? "border-nutrition-200 bg-nutrition-50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {point.fullDate}
                      </p>
                      {isSelectedDate ? (
                        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-nutrition-700">
                          Registro seleccionado
                        </span>
                      ) : null}
                    </div>

                    {selectedMetric?.metric_type === "blood_pressure" ? (
                      <div className="text-right">
                        <p className="text-sm font-semibold text-red-500">
                          {point.systolic}{" "}
                          <span className="text-xs font-medium text-gray-400">
                            sys
                          </span>
                        </p>
                        <p className="text-sm font-semibold text-orange-500">
                          {point.diastolic}{" "}
                          <span className="text-xs font-medium text-gray-400">
                            dia
                          </span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">
                        {formatMetricValue(point.value ?? 0)}{" "}
                        <span className="text-xs font-medium text-gray-400">
                          {point.unit}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );

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
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
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
                className={`flex transform flex-col overflow-hidden border border-gray-100 bg-white shadow-2xl transition-all ${
                  isFullscreen
                    ? "h-[96vh] w-[96vw] rounded-[2.5rem]"
                    : "h-[min(88vh,860px)] w-[min(92vw,1240px)] rounded-[2.5rem]"
                }`}
              >
                <div className="flex shrink-0 items-start justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-6">
                  <div className="flex min-w-0 items-start gap-3">
                    {selectedMetric ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMetric(null);
                          setHoveredDate(null);
                          setTimeFilter("all");
                          setCustomStartDate("");
                          setCustomEndDate("");
                        }}
                        className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300"
                        aria-label="Volver a la lista de mediciones"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    ) : (
                      <div className="mt-0.5 rounded-2xl bg-nutrition-100 p-2.5 text-nutrition-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <Dialog.Title
                        as="h3"
                        className="truncate text-2xl font-black tracking-tight text-gray-950"
                      >
                        {selectedMetric
                          ? selectedMetricLabel
                          : "Detalle de mediciones"}
                      </Dialog.Title>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {selectedMetric
                          ? `Historial registrado el ${selectedDate}`
                          : `Registradas el ${selectedDate}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsFullscreen((current) => !current)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300"
                      aria-label={
                        isFullscreen
                          ? "Restaurar tamano del modal"
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
                      type="button"
                      onClick={onClose}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-gray-400 transition-all hover:bg-gray-50 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-300"
                      aria-label="Cerrar detalle"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {selectedMetric ? detailContent : overviewContent}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
