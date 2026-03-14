import { useParams, useNavigate } from "react-router-dom";
import {
  useClientHistory,
  useDeleteClientHealthMetric,
  useDeleteMeasurement,
} from "@/features/client-history/queries";
import { ClientMetricHistory } from "@/features/client-history/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Ruler,
  Scale,
  Activity,
  HeartPulse,
  Droplet,
  AlertCircle,
  ArrowLeft,
  TrendingDown,
  AlertTriangle,
  Home,
  Moon,
  UtensilsCrossed,
  Flame,
  Target,
  Zap,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Trash2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { MetricHistoryModal } from "./components/MetricHistoryModal";
import { AddMeasurementModal } from "./components/AddMeasurementModal";
import {
  MeasurementDetailsModal,
  type MeasurementRecord,
  type MeasurementRecordMetric,
} from "./components/MeasurementDetailsModal";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { ClientMetric, MetricType } from "@/services/client-metrics";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-hot-toast";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  metrics?: {
    currentWeight: number;
    weightUnit: string;
    weightChange?: number;
    weightChangeLabel?: string;
  };
  client_metrics?: ClientMetric[];
  goals?: { name: string; isPrimary: boolean }[];
  medicalConditions?: string;
  // New measurements
  chestCm?: number;
  cephalicCm?: number;
  neckCm?: number;
  relaxedArmMidpointCm?: number;
  contractedArmMidpointCm?: number;
  forearmCm?: number;
  wristCm?: number;
  mesosternalCm?: number;
  umbilicalCm?: number;
  biacromialCm?: number;
  biiliocrestalCm?: number;
  footLengthCm?: number;
  thoraxTransverseCm?: number;
  thoraxAnteroposteriorCm?: number;
  humerusBiepicondylarCm?: number;
  wristBistyloidCm?: number;
  femurBiepicondylarCm?: number;
  bimaleolarCm?: number;
  footTransverseCm?: number;
  handLengthCm?: number;
  handTransverseCm?: number;
  armLeftCm?: number;
  armRightCm?: number;
  midThighCm?: number;
  calfCm?: number;
  thighLeftCm?: number;
  thighRightCm?: number;
  calfLeftCm?: number;
  calfRightCm?: number;
  upperBodyFatPct?: number;
  lowerBodyFatPct?: number;
  fatFreeMassKg?: number;
  boneMassKg?: number;
  bodyWaterPct?: number;
  metabolicAge?: number;
  [key: string]: any;
}

type CompositionRecord = MeasurementRecord & {
  peso?: MeasurementRecordMetric;
  grasa?: MeasurementRecordMetric;
  musculo?: MeasurementRecordMetric;
  sourceMeasurement: ClientMetricHistory;
};

type HealthRecord = MeasurementRecord & {
  presion?: MeasurementRecordMetric;
  glucosa?: MeasurementRecordMetric;
  frecuencia?: MeasurementRecordMetric;
  oxigeno?: MeasurementRecordMetric;
};

const HISTORY_METRICS_FETCH_LIMIT = 100;

const formatOptionalMetricValue = (value?: number | null) =>
  value === undefined || value === null || Number.isNaN(value) ? "-" : value;

const getMeasurementRecordDateLabel = (rawDate: string) =>
  format(new Date(rawDate), "dd MMM yyyy, HH:mm", { locale: es });

const getPercentageBarWidth = (value?: number | null) => {
  if (
    value === undefined ||
    value === null ||
    Number.isNaN(value) ||
    value <= 0
  )
    return "0%";

  return `${Math.min(value, 100)}%`;
};

const getBodyMassIndex = (
  weightKg?: number | null,
  heightCm?: number | null,
) => {
  if (
    weightKg === undefined ||
    weightKg === null ||
    heightCm === undefined ||
    heightCm === null ||
    Number.isNaN(weightKg) ||
    Number.isNaN(heightCm) ||
    weightKg <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightInMeters = heightCm / 100;
  return Number((weightKg / (heightInMeters * heightInMeters)).toFixed(1));
};

const getBmiDescriptor = (bmi?: number | null) => {
  if (bmi === undefined || bmi === null || Number.isNaN(bmi) || bmi <= 0) {
    return {
      label: "Sin datos",
      className: "bg-gray-100 text-gray-500",
    };
  }

  if (bmi < 18.5) {
    return {
      label: "Bajo peso",
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (bmi < 25) {
    return {
      label: "Normal",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (bmi < 30) {
    return {
      label: "Sobrepeso",
      className: "bg-orange-100 text-orange-700",
    };
  }

  return {
    label: "Obesidad",
    className: "bg-rose-100 text-rose-700",
  };
};

export function NutritionClientMedicalHistoryPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const { data: historyData, isLoading: historyLoading } = useClientHistory(
    clientId || "",
    1,
    HISTORY_METRICS_FETCH_LIMIT,
  );

  const [selectedMetric, setSelectedMetric] = useState<{
    type: MetricType | "weight_kg" | "composition";
    title: string;
    unit?: string;
    tabs?: { label: string; metricType: string }[];
    series?: { metricType: string; label: string; color: string }[];
  } | null>(null);

  const [activeMetricTab, setActiveMetricTab] = useState<
    "calculos" | "antropometria"
  >("antropometria");
  const [activeMeasurementTab, setActiveMeasurementTab] = useState<
    "composition" | "health"
  >("composition");
  const [isAddMeasurementModalOpen, setIsAddMeasurementModalOpen] =
    useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<MeasurementRecord | null>(null);
  const [measurementToEdit, setMeasurementToEdit] =
    useState<ClientMetricHistory | null>(null);
  const [recordToDelete, setRecordToDelete] =
    useState<MeasurementRecord | null>(null);
  const [removingRecordId, setRemovingRecordId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const deleteMeasurementMutation = useDeleteMeasurement();
  const deleteHealthMetricMutation = useDeleteClientHealthMetric();

  const getMetricsByType = (
    type: string,
    tabs?: { metricType: string }[],
    series?: { metricType: string }[],
  ): ClientMetric[] => {
    // Special handling for health metrics (BP, Glucose)
    if (type === "blood_pressure" && historyData?.client_health_metrics) {
      const metrics: ClientMetric[] = [];
      historyData.client_health_metrics.forEach((m) => {
        if (m.systolic_mmhg && m.diastolic_mmhg) {
          metrics.push({
            id: `bp_sys_${m.id}`,
            client_id: m.user_id.toString(),
            metric_type: "systolic",
            value: m.systolic_mmhg,
            unit: "mmHg",
            date: m.recorded_at,
            created_at: m.recorded_at,
            updated_at: m.recorded_at,
          });
          metrics.push({
            id: `bp_dia_${m.id}`,
            client_id: m.user_id.toString(),
            metric_type: "diastolic",
            value: m.diastolic_mmhg,
            unit: "mmHg",
            date: m.recorded_at,
            created_at: m.recorded_at,
            updated_at: m.recorded_at,
          });
        }
      });
      return metrics;
    }

    if (type === "glucose" && historyData?.client_health_metrics) {
      return historyData.client_health_metrics
        .filter((m) => m.glucose_mg_dl)
        .map((m) => ({
          id: `gl_${m.id}`,
          client_id: m.user_id.toString(),
          metric_type: "glucose" as MetricType,
          value: m.glucose_mg_dl!,
          unit: "mg/dL",
          date: m.recorded_at,
          created_at: m.recorded_at,
          updated_at: m.recorded_at,
        }));
    }

    if (type === "heart_rate" && historyData?.client_health_metrics) {
      return historyData.client_health_metrics
        .filter((m) => m.heart_rate_bpm !== null)
        .map((m) => ({
          id: `hr_${m.id}`,
          client_id: m.user_id.toString(),
          metric_type: "heart_rate" as MetricType,
          value: m.heart_rate_bpm as number,
          unit: "bpm",
          date: m.recorded_at,
          created_at: m.recorded_at,
          updated_at: m.recorded_at,
        }));
    }

    if (type === "oxygen_saturation" && historyData?.client_health_metrics) {
      return historyData.client_health_metrics
        .filter((m) => m.oxygen_saturation_pct !== null)
        .map((m) => ({
          id: `ox_${m.id}`,
          client_id: m.user_id.toString(),
          metric_type: "oxygen_saturation" as MetricType,
          value: Number(m.oxygen_saturation_pct),
          unit: "%",
          date: m.recorded_at,
          created_at: m.recorded_at,
          updated_at: m.recorded_at,
        }));
    }

    if (!client?.client_metrics) return [];

    if (series) {
      const types = series.map((s) => s.metricType);
      return client.client_metrics.filter((m) => types.includes(m.metric_type));
    }

    if (tabs) {
      const types = tabs.map((t) => t.metricType);
      return client.client_metrics.filter((m) => types.includes(m.metric_type));
    }

    // Map 'weight_kg' to 'weight' for filtering if needed, or keep as is if backend sends 'weight'
    const targetType = type === "weight_kg" ? "weight" : type;
    return client.client_metrics.filter((m) => m.metric_type === targetType);
  };

  const normalizeMetrics = (
    historyMetrics: ClientMetricHistory[],
  ): ClientMetric[] => {
    const normalized: ClientMetric[] = [];

    historyMetrics.forEach((h) => {
      const date = h.date;

      if (h.weight_kg)
        normalized.push({
          id: h.id + "_w",
          client_id: h.user_id.toString(),
          metric_type: "weight",
          value: parseFloat(h.weight_kg),
          unit: "kg",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.body_fat_pct)
        normalized.push({
          id: h.id + "_bf",
          client_id: h.user_id.toString(),
          metric_type: "body_fat",
          value: parseFloat(h.body_fat_pct),
          unit: "%",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.upper_body_fat_pct)
        normalized.push({
          id: h.id + "_ubf",
          client_id: h.user_id.toString(),
          metric_type: "upper_body_fat",
          value: parseFloat(h.upper_body_fat_pct),
          unit: "%",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.lower_body_fat_pct)
        normalized.push({
          id: h.id + "_lbf",
          client_id: h.user_id.toString(),
          metric_type: "lower_body_fat",
          value: parseFloat(h.lower_body_fat_pct),
          unit: "%",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.fat_free_mass_kg)
        normalized.push({
          id: h.id + "_ffm",
          client_id: h.user_id.toString(),
          metric_type: "fat_free_mass",
          value: parseFloat(h.fat_free_mass_kg),
          unit: "kg",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.muscle_mass_kg)
        normalized.push({
          id: h.id + "_mm",
          client_id: h.user_id.toString(),
          metric_type: "muscle_mass",
          value: parseFloat(h.muscle_mass_kg),
          unit: "kg",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.bone_mass_kg)
        normalized.push({
          id: h.id + "_bone",
          client_id: h.user_id.toString(),
          metric_type: "bone_mass",
          value: parseFloat(h.bone_mass_kg),
          unit: "kg",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.metabolic_age !== null && h.metabolic_age !== undefined)
        normalized.push({
          id: h.id + "_metabolic_age",
          client_id: h.user_id.toString(),
          metric_type: "metabolic_age",
          value: h.metabolic_age,
          unit: "anos",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });

      if (h.visceral_fat)
        normalized.push({
          id: h.id + "_vf",
          client_id: h.user_id.toString(),
          metric_type: "visceral_fat",
          value: parseFloat(h.visceral_fat),
          unit: "",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.water_pct)
        normalized.push({
          id: h.id + "_water",
          client_id: h.user_id.toString(),
          metric_type: "body_water",
          value: parseFloat(h.water_pct),
          unit: "%",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.waist_cm)
        normalized.push({
          id: h.id + "_waist",
          client_id: h.user_id.toString(),
          metric_type: "waist",
          value: parseFloat(h.waist_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.hip_cm)
        normalized.push({
          id: h.id + "_hip",
          client_id: h.user_id.toString(),
          metric_type: "hips",
          value: parseFloat(h.hip_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.chest_cm)
        normalized.push({
          id: h.id + "_chest",
          client_id: h.user_id.toString(),
          metric_type: "chest",
          value: parseFloat(h.chest_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.cephalic_cm)
        normalized.push({
          id: h.id + "_cephalic",
          client_id: h.user_id.toString(),
          metric_type: "cephalic",
          value: parseFloat(h.cephalic_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.neck_cm)
        normalized.push({
          id: h.id + "_neck",
          client_id: h.user_id.toString(),
          metric_type: "neck",
          value: parseFloat(h.neck_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.mesosternal_cm)
        normalized.push({
          id: h.id + "_mesosternal",
          client_id: h.user_id.toString(),
          metric_type: "mesosternal",
          value: parseFloat(h.mesosternal_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.umbilical_cm)
        normalized.push({
          id: h.id + "_umbilical",
          client_id: h.user_id.toString(),
          metric_type: "umbilical",
          value: parseFloat(h.umbilical_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.biacromial_cm)
        normalized.push({
          id: h.id + "_biacromial",
          client_id: h.user_id.toString(),
          metric_type: "biacromial",
          value: parseFloat(h.biacromial_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.biiliocrestal_cm)
        normalized.push({
          id: h.id + "_biiliocrestal",
          client_id: h.user_id.toString(),
          metric_type: "biiliocrestal",
          value: parseFloat(h.biiliocrestal_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.foot_length_cm)
        normalized.push({
          id: h.id + "_foot_length",
          client_id: h.user_id.toString(),
          metric_type: "foot_length",
          value: parseFloat(h.foot_length_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.thorax_transverse_cm)
        normalized.push({
          id: h.id + "_thorax_transverse",
          client_id: h.user_id.toString(),
          metric_type: "thorax_transverse",
          value: parseFloat(h.thorax_transverse_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.thorax_anteroposterior_cm)
        normalized.push({
          id: h.id + "_thorax_ap",
          client_id: h.user_id.toString(),
          metric_type: "thorax_anteroposterior",
          value: parseFloat(h.thorax_anteroposterior_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.humerus_biepicondylar_cm)
        normalized.push({
          id: h.id + "_humerus",
          client_id: h.user_id.toString(),
          metric_type: "humerus_biepicondylar",
          value: parseFloat(h.humerus_biepicondylar_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.wrist_bistyloid_cm)
        normalized.push({
          id: h.id + "_wrist_bistyloid",
          client_id: h.user_id.toString(),
          metric_type: "wrist_bistyloid",
          value: parseFloat(h.wrist_bistyloid_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.femur_biepicondylar_cm)
        normalized.push({
          id: h.id + "_femur",
          client_id: h.user_id.toString(),
          metric_type: "femur_biepicondylar",
          value: parseFloat(h.femur_biepicondylar_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.bimaleolar_cm)
        normalized.push({
          id: h.id + "_bimaleolar",
          client_id: h.user_id.toString(),
          metric_type: "bimaleolar",
          value: parseFloat(h.bimaleolar_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.foot_transverse_cm)
        normalized.push({
          id: h.id + "_foot_transverse",
          client_id: h.user_id.toString(),
          metric_type: "foot_transverse",
          value: parseFloat(h.foot_transverse_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.hand_length_cm)
        normalized.push({
          id: h.id + "_hand_length",
          client_id: h.user_id.toString(),
          metric_type: "hand_length",
          value: parseFloat(h.hand_length_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.hand_transverse_cm)
        normalized.push({
          id: h.id + "_hand_transverse",
          client_id: h.user_id.toString(),
          metric_type: "hand_transverse",
          value: parseFloat(h.hand_transverse_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.arm_left_cm)
        normalized.push({
          id: h.id + "_arml",
          client_id: h.user_id.toString(),
          metric_type: "arm_left",
          value: parseFloat(h.arm_left_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.arm_right_cm)
        normalized.push({
          id: h.id + "_armr",
          client_id: h.user_id.toString(),
          metric_type: "arm_right",
          value: parseFloat(h.arm_right_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.relaxed_arm_midpoint_cm)
        normalized.push({
          id: h.id + "_arm_mid_relaxed",
          client_id: h.user_id.toString(),
          metric_type: "relaxed_arm_midpoint",
          value: parseFloat(h.relaxed_arm_midpoint_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.contracted_arm_midpoint_cm)
        normalized.push({
          id: h.id + "_arm_mid_contracted",
          client_id: h.user_id.toString(),
          metric_type: "contracted_arm_midpoint",
          value: parseFloat(h.contracted_arm_midpoint_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.forearm_cm)
        normalized.push({
          id: h.id + "_forearm",
          client_id: h.user_id.toString(),
          metric_type: "forearm",
          value: parseFloat(h.forearm_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.wrist_cm)
        normalized.push({
          id: h.id + "_wrist",
          client_id: h.user_id.toString(),
          metric_type: "wrist",
          value: parseFloat(h.wrist_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.mid_thigh_cm)
        normalized.push({
          id: h.id + "_mid_thigh",
          client_id: h.user_id.toString(),
          metric_type: "mid_thigh",
          value: parseFloat(h.mid_thigh_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.calf_cm)
        normalized.push({
          id: h.id + "_calf",
          client_id: h.user_id.toString(),
          metric_type: "calf",
          value: parseFloat(h.calf_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.thigh_left_cm)
        normalized.push({
          id: h.id + "_thighl",
          client_id: h.user_id.toString(),
          metric_type: "thigh_left",
          value: parseFloat(h.thigh_left_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.thigh_right_cm)
        normalized.push({
          id: h.id + "_thighr",
          client_id: h.user_id.toString(),
          metric_type: "thigh_right",
          value: parseFloat(h.thigh_right_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.calf_left_cm)
        normalized.push({
          id: h.id + "_calfl",
          client_id: h.user_id.toString(),
          metric_type: "calf_left",
          value: parseFloat(h.calf_left_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.calf_right_cm)
        normalized.push({
          id: h.id + "_calfr",
          client_id: h.user_id.toString(),
          metric_type: "calf_right",
          value: parseFloat(h.calf_right_cm),
          unit: "cm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.subscapular_fold_mm)
        normalized.push({
          id: h.id + "_subscap",
          client_id: h.user_id.toString(),
          metric_type: "subscapular_fold",
          value: parseFloat(h.subscapular_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.triceps_fold_mm)
        normalized.push({
          id: h.id + "_triceps",
          client_id: h.user_id.toString(),
          metric_type: "triceps_fold",
          value: parseFloat(h.triceps_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.biceps_fold_mm)
        normalized.push({
          id: h.id + "_biceps",
          client_id: h.user_id.toString(),
          metric_type: "biceps_fold",
          value: parseFloat(h.biceps_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.iliac_crest_fold_mm)
        normalized.push({
          id: h.id + "_iliac",
          client_id: h.user_id.toString(),
          metric_type: "iliac_crest_fold",
          value: parseFloat(h.iliac_crest_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.supraspinal_fold_mm)
        normalized.push({
          id: h.id + "_supraspinal",
          client_id: h.user_id.toString(),
          metric_type: "supraspinal_fold",
          value: parseFloat(h.supraspinal_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.abdominal_fold_mm)
        normalized.push({
          id: h.id + "_abfold",
          client_id: h.user_id.toString(),
          metric_type: "abdominal_fold",
          value: parseFloat(h.abdominal_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.front_thigh_fold_mm)
        normalized.push({
          id: h.id + "_frontthigh",
          client_id: h.user_id.toString(),
          metric_type: "front_thigh_fold",
          value: parseFloat(h.front_thigh_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.medial_calf_fold_mm)
        normalized.push({
          id: h.id + "_medcalf",
          client_id: h.user_id.toString(),
          metric_type: "medial_calf_fold",
          value: parseFloat(h.medial_calf_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.mid_axillary_fold_mm)
        normalized.push({
          id: h.id + "_midax",
          client_id: h.user_id.toString(),
          metric_type: "mid_axillary_fold",
          value: parseFloat(h.mid_axillary_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
      if (h.pectoral_fold_mm)
        normalized.push({
          id: h.id + "_pectoral",
          client_id: h.user_id.toString(),
          metric_type: "pectoral_fold",
          value: parseFloat(h.pectoral_fold_mm),
          unit: "mm",
          date,
          created_at: h.logged_at,
          updated_at: h.logged_at,
        });
    });

    return normalized;
  };

  useEffect(() => {
    if (historyData) {
      const normalizedMetrics = normalizeMetrics(
        historyData.client_metrics || [],
      );
      console.log("Normalized Metrics:", normalizedMetrics);
      console.log(
        "Muscle Mass Metrics:",
        normalizedMetrics.filter((m) => m.metric_type === "muscle_mass"),
      );

      // Helper to handle date sorting correctly
      const weightMetrics = normalizedMetrics
        .filter((m) => m.metric_type === "weight")
        .sort(
          (a: any, b: any) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      let weightChange = 0;
      let weightChangeLabel = "desde la última medición";

      if (weightMetrics.length > 1) {
        const latest = weightMetrics[0];
        const previous = weightMetrics[1];

        weightChange = latest.value - previous.value;

        // Fix Timezone issue: Parse date part only to create local date
        const previousDatePart = previous.date.split("T")[0];
        // Append T00:00:00 (without Z) to force local time interpretation
        const previousDateLocal = new Date(`${previousDatePart}T00:00:00`);

        const dateStr = format(previousDateLocal, "d 'de' MMM", { locale: es });
        weightChangeLabel = `desde el ${dateStr}`;
      }

      const mappedClient: Client = {
        id: historyData.id.toString(),
        firstName: historyData.name,
        lastName: historyData.lastname,
        email: historyData.email,
        avatar:
          historyData.profile_picture ||
          `https://ui-avatars.com/api/?name=${historyData.name}+${historyData.lastname}&background=random`,
        metrics: {
          currentWeight: historyData.client_metrics?.[0]?.weight_kg
            ? parseFloat(historyData.client_metrics[0].weight_kg)
            : 0,
          weightUnit: "kg", // Default or derive from somewhere
          weightChange: weightChange,
          weightChangeLabel: weightChangeLabel,
        },
        // Enrich with dashboard specific fields if missing from API or map them
        age: 0, // Placeholder
        primaryGoal:
          historyData.client_goals?.find((g) => g.is_primary)?.goals?.name ||
          historyData.client_goals
            ?.find((g) => g.is_primary)
            ?.goal_id.toString() ||
          "General",
        goals:
          historyData.client_goals?.map((g) => ({
            name: g.goals?.name || g.goal_id.toString(),
            isPrimary: g.is_primary,
          })) || [],
        medicalConditions:
          historyData.client_records?.[0]?.medical_conditions || "",
        experienceLevel: "Intermedio", // Placeholder
        heightCm: historyData.client_metrics?.[0]?.height_cm
          ? parseFloat(historyData.client_metrics[0].height_cm)
          : 0,
        bmr: 0, // Calculate if possible
        tdee: 0, // Calculate if possible
        bmi: 0, // Calculate
        waistCm: historyData.client_metrics?.[0]?.waist_cm
          ? parseFloat(historyData.client_metrics[0].waist_cm)
          : 0,
        hipCm: historyData.client_metrics?.[0]?.hip_cm
          ? parseFloat(historyData.client_metrics[0].hip_cm)
          : 0,
        chestCm: historyData.client_metrics?.[0]?.chest_cm
          ? parseFloat(historyData.client_metrics[0].chest_cm)
          : 0,
        cephalicCm: historyData.client_metrics?.[0]?.cephalic_cm
          ? parseFloat(historyData.client_metrics[0].cephalic_cm)
          : 0,
        neckCm: historyData.client_metrics?.[0]?.neck_cm
          ? parseFloat(historyData.client_metrics[0].neck_cm)
          : 0,
        relaxedArmMidpointCm: historyData.client_metrics?.[0]
          ?.relaxed_arm_midpoint_cm
          ? parseFloat(historyData.client_metrics[0].relaxed_arm_midpoint_cm)
          : 0,
        contractedArmMidpointCm: historyData.client_metrics?.[0]
          ?.contracted_arm_midpoint_cm
          ? parseFloat(historyData.client_metrics[0].contracted_arm_midpoint_cm)
          : 0,
        forearmCm: historyData.client_metrics?.[0]?.forearm_cm
          ? parseFloat(historyData.client_metrics[0].forearm_cm)
          : 0,
        wristCm: historyData.client_metrics?.[0]?.wrist_cm
          ? parseFloat(historyData.client_metrics[0].wrist_cm)
          : 0,
        mesosternalCm: historyData.client_metrics?.[0]?.mesosternal_cm
          ? parseFloat(historyData.client_metrics[0].mesosternal_cm)
          : 0,
        umbilicalCm: historyData.client_metrics?.[0]?.umbilical_cm
          ? parseFloat(historyData.client_metrics[0].umbilical_cm)
          : 0,
        biacromialCm: historyData.client_metrics?.[0]?.biacromial_cm
          ? parseFloat(historyData.client_metrics[0].biacromial_cm)
          : 0,
        biiliocrestalCm: historyData.client_metrics?.[0]?.biiliocrestal_cm
          ? parseFloat(historyData.client_metrics[0].biiliocrestal_cm)
          : 0,
        footLengthCm: historyData.client_metrics?.[0]?.foot_length_cm
          ? parseFloat(historyData.client_metrics[0].foot_length_cm)
          : 0,
        thoraxTransverseCm: historyData.client_metrics?.[0]
          ?.thorax_transverse_cm
          ? parseFloat(historyData.client_metrics[0].thorax_transverse_cm)
          : 0,
        thoraxAnteroposteriorCm: historyData.client_metrics?.[0]
          ?.thorax_anteroposterior_cm
          ? parseFloat(historyData.client_metrics[0].thorax_anteroposterior_cm)
          : 0,
        humerusBiepicondylarCm: historyData.client_metrics?.[0]
          ?.humerus_biepicondylar_cm
          ? parseFloat(historyData.client_metrics[0].humerus_biepicondylar_cm)
          : 0,
        wristBistyloidCm: historyData.client_metrics?.[0]?.wrist_bistyloid_cm
          ? parseFloat(historyData.client_metrics[0].wrist_bistyloid_cm)
          : 0,
        femurBiepicondylarCm: historyData.client_metrics?.[0]
          ?.femur_biepicondylar_cm
          ? parseFloat(historyData.client_metrics[0].femur_biepicondylar_cm)
          : 0,
        bimaleolarCm: historyData.client_metrics?.[0]?.bimaleolar_cm
          ? parseFloat(historyData.client_metrics[0].bimaleolar_cm)
          : 0,
        footTransverseCm: historyData.client_metrics?.[0]?.foot_transverse_cm
          ? parseFloat(historyData.client_metrics[0].foot_transverse_cm)
          : 0,
        handLengthCm: historyData.client_metrics?.[0]?.hand_length_cm
          ? parseFloat(historyData.client_metrics[0].hand_length_cm)
          : 0,
        handTransverseCm: historyData.client_metrics?.[0]?.hand_transverse_cm
          ? parseFloat(historyData.client_metrics[0].hand_transverse_cm)
          : 0,
        armLeftCm: historyData.client_metrics?.[0]?.arm_left_cm
          ? parseFloat(historyData.client_metrics[0].arm_left_cm)
          : 0,
        armRightCm: historyData.client_metrics?.[0]?.arm_right_cm
          ? parseFloat(historyData.client_metrics[0].arm_right_cm)
          : 0,
        midThighCm: historyData.client_metrics?.[0]?.mid_thigh_cm
          ? parseFloat(historyData.client_metrics[0].mid_thigh_cm)
          : 0,
        calfCm: historyData.client_metrics?.[0]?.calf_cm
          ? parseFloat(historyData.client_metrics[0].calf_cm)
          : 0,
        thighLeftCm: historyData.client_metrics?.[0]?.thigh_left_cm
          ? parseFloat(historyData.client_metrics[0].thigh_left_cm)
          : 0,
        thighRightCm: historyData.client_metrics?.[0]?.thigh_right_cm
          ? parseFloat(historyData.client_metrics[0].thigh_right_cm)
          : 0,
        calfLeftCm: historyData.client_metrics?.[0]?.calf_left_cm
          ? parseFloat(historyData.client_metrics[0].calf_left_cm)
          : 0,
        calfRightCm: historyData.client_metrics?.[0]?.calf_right_cm
          ? parseFloat(historyData.client_metrics[0].calf_right_cm)
          : 0,
        bodyFatPct: historyData.client_metrics?.[0]?.body_fat_pct
          ? parseFloat(historyData.client_metrics[0].body_fat_pct)
          : 0,
        upperBodyFatPct: historyData.client_metrics?.[0]?.upper_body_fat_pct
          ? parseFloat(historyData.client_metrics[0].upper_body_fat_pct)
          : undefined,
        lowerBodyFatPct: historyData.client_metrics?.[0]?.lower_body_fat_pct
          ? parseFloat(historyData.client_metrics[0].lower_body_fat_pct)
          : undefined,
        fatFreeMassKg: historyData.client_metrics?.[0]?.fat_free_mass_kg
          ? parseFloat(historyData.client_metrics[0].fat_free_mass_kg)
          : undefined,
        muscleMassKg: historyData.client_metrics?.[0]?.muscle_mass_kg
          ? parseFloat(historyData.client_metrics[0].muscle_mass_kg)
          : 0,
        boneMassKg: historyData.client_metrics?.[0]?.bone_mass_kg
          ? parseFloat(historyData.client_metrics[0].bone_mass_kg)
          : undefined,
        bodyWaterPct: historyData.client_metrics?.[0]?.water_pct
          ? parseFloat(historyData.client_metrics[0].water_pct)
          : undefined,
        metabolicAge:
          historyData.client_metrics?.[0]?.metabolic_age ?? undefined,
        visceralFatLevel: historyData.client_metrics?.[0]?.visceral_fat
          ? parseFloat(historyData.client_metrics[0].visceral_fat)
          : 0,
        injuries: [], // Map if available
        trainingEnvironment: "Gimnasio", // Placeholder
        allergies:
          historyData.client_allergens?.map((a) => a.allergens.name) || [],
        dislikes: historyData.client_records?.[0]?.preferences?.dislikes || [],
        sleepHoursAvg: 7, // Placeholder
        bloodPressure: (() => {
          const latestBP = historyData.client_health_metrics
            ?.filter((m) => m.systolic_mmhg && m.diastolic_mmhg)
            ?.sort(
              (a, b) =>
                new Date(b.recorded_at).getTime() -
                new Date(a.recorded_at).getTime(),
            )[0];
          return latestBP
            ? `${latestBP.systolic_mmhg}/${latestBP.diastolic_mmhg}`
            : "120/80";
        })(),
        glucoseLevel: (() => {
          const latestGlucose = historyData.client_health_metrics
            ?.filter((m) => m.glucose_mg_dl)
            ?.sort(
              (a, b) =>
                new Date(b.recorded_at).getTime() -
                new Date(a.recorded_at).getTime(),
            )[0];
          return latestGlucose?.glucose_mg_dl || 0;
        })(),
        heartRateBpm: (() => {
          const latestHeartRate = historyData.client_health_metrics
            ?.filter((m) => m.heart_rate_bpm !== null)
            ?.sort(
              (a, b) =>
                new Date(b.recorded_at).getTime() -
                new Date(a.recorded_at).getTime(),
            )[0];
          return latestHeartRate?.heart_rate_bpm || 0;
        })(),
        oxygenSaturationPct: (() => {
          const latestOxygenSaturation = historyData.client_health_metrics
            ?.filter((m) => m.oxygen_saturation_pct !== null)
            ?.sort(
              (a, b) =>
                new Date(b.recorded_at).getTime() -
                new Date(a.recorded_at).getTime(),
            )[0];
          return latestOxygenSaturation?.oxygen_saturation_pct
            ? Number(latestOxygenSaturation.oxygen_saturation_pct)
            : 0;
        })(),
        client_metrics: normalizeMetrics(historyData.client_metrics || []),
      };
      mappedClient.bmi = getBodyMassIndex(
        mappedClient.metrics?.currentWeight,
        mappedClient.heightCm,
      );
      setClient(mappedClient);
    }
  }, [historyData]);

  const compositionRecords = useMemo<CompositionRecord[]>(() => {
    return (historyData?.client_metrics || [])
      .map((measurement) => {
        const metrics = normalizeMetrics([measurement]).map(
          (metric): MeasurementRecordMetric => ({
            id: metric.id,
            metric_type: metric.metric_type,
            value: metric.value,
            unit: metric.unit,
            date: metric.date,
          }),
        );

        return {
          recordId: String(measurement.id),
          recordType: "measurement" as const,
          measurementId: String(measurement.id),
          rawDate: measurement.logged_at || measurement.date,
          metrics,
          sourceMeasurement: measurement,
          peso: metrics.find((metric) => metric.metric_type === "weight"),
          grasa: metrics.find((metric) => metric.metric_type === "body_fat"),
          musculo: metrics.find(
            (metric) => metric.metric_type === "muscle_mass",
          ),
        };
      })
      .sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
      );
  }, [historyData]);

  const healthRecords = useMemo<HealthRecord[]>(() => {
    return (historyData?.client_health_metrics || [])
      .map((metric) => {
        const metrics: MeasurementRecordMetric[] = [];
        const record: HealthRecord = {
          recordId: String(metric.id),
          recordType: "health_metric",
          healthMetricId: String(metric.id),
          rawDate: metric.recorded_at,
          metrics,
        };

        if (metric.systolic_mmhg && metric.diastolic_mmhg) {
          const bloodPressureMetric: MeasurementRecordMetric = {
            id: `bp_${metric.id}`,
            metric_type: "blood_pressure",
            value: `${metric.systolic_mmhg}/${metric.diastolic_mmhg}`,
            unit: "mmHg",
            date: metric.recorded_at,
          };
          metrics.push(bloodPressureMetric);
          record.presion = bloodPressureMetric;
        }

        if (metric.glucose_mg_dl) {
          const glucoseMetric: MeasurementRecordMetric = {
            id: `gl_${metric.id}`,
            metric_type: "glucose",
            value: metric.glucose_mg_dl,
            unit: "mg/dL",
            date: metric.recorded_at,
          };
          metrics.push(glucoseMetric);
          record.glucosa = glucoseMetric;
        }

        if (metric.heart_rate_bpm !== null) {
          const heartRateMetric: MeasurementRecordMetric = {
            id: `hr_${metric.id}`,
            metric_type: "heart_rate",
            value: metric.heart_rate_bpm,
            unit: "bpm",
            date: metric.recorded_at,
          };
          metrics.push(heartRateMetric);
          record.frecuencia = heartRateMetric;
        }

        if (metric.oxygen_saturation_pct !== null) {
          const oxygenSaturationMetric: MeasurementRecordMetric = {
            id: `ox_${metric.id}`,
            metric_type: "oxygen_saturation",
            value: Number(metric.oxygen_saturation_pct),
            unit: "%",
            date: metric.recorded_at,
          };
          metrics.push(oxygenSaturationMetric);
          record.oxigeno = oxygenSaturationMetric;
        }

        return record;
      })
      .filter((record) => record.metrics.length > 0)
      .sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
      );
  }, [historyData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeMeasurementTab]);

  const activeGroupedMetrics = useMemo(
    () =>
      (activeMeasurementTab === "health"
        ? healthRecords
        : compositionRecords
      ).filter((record) => record.recordId !== removingRecordId),
    [activeMeasurementTab, compositionRecords, healthRecords, removingRecordId],
  );

  useEffect(() => {
    if (
      removingRecordId &&
      !compositionRecords.some(
        (record) => record.recordId === removingRecordId,
      ) &&
      !healthRecords.some((record) => record.recordId === removingRecordId)
    ) {
      setRemovingRecordId(null);
    }
  }, [compositionRecords, healthRecords, removingRecordId]);

  const totalPages =
    activeGroupedMetrics.length === 0
      ? 1
      : Math.ceil(activeGroupedMetrics.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMetrics = activeGroupedMetrics.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const paginatedCompositionRecords = paginatedMetrics as CompositionRecord[];
  const paginatedHealthRecords = paginatedMetrics as HealthRecord[];
  const isDeletingRecord =
    deleteMeasurementMutation.isPending || deleteHealthMetricMutation.isPending;

  const handleDeleteRecord = async () => {
    if (!recordToDelete) return;

    const targetRecord = recordToDelete;
    setRemovingRecordId(targetRecord.recordId);
    setRecordToDelete(null);

    await new Promise((resolve) => window.setTimeout(resolve, 380));

    try {
      if (targetRecord.recordType === "measurement") {
        await deleteMeasurementMutation.mutateAsync(targetRecord.recordId);
      } else {
        await deleteHealthMetricMutation.mutateAsync(targetRecord.recordId);
      }

      if (
        selectedRecord?.recordId === targetRecord.recordId &&
        selectedRecord.recordType === targetRecord.recordType
      ) {
        setSelectedRecord(null);
      }

      toast.success("Registro eliminado");
    } catch (error: any) {
      setRemovingRecordId(null);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo eliminar el registro.",
      );
    }
  };

  const openDeleteDialog = (record: MeasurementRecord) => {
    setRecordToDelete(record);
  };

  const closeDeleteDialog = () => {
    if (!isDeletingRecord) {
      setRecordToDelete(null);
    }
  };

  if (historyLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Cargando perfil del paciente...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 mb-4">Cliente no encontrado</p>
        <button
          onClick={() => navigate("/nutrition/clients")}
          className="text-nutrition-600 font-medium hover:cursor-pointer"
        >
          Volver a lista de clientes
        </button>
      </div>
    );
  }

  const visceralColor =
    client.visceralFatLevel < 10
      ? "bg-green-100 text-green-700"
      : client.visceralFatLevel < 15
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";
  const currentWeight = client.metrics?.currentWeight ?? 0;
  const currentHeight = client.heightCm ?? 0;
  const currentBmi = getBodyMassIndex(currentWeight, currentHeight);
  const bmiDescriptor = getBmiDescriptor(currentBmi);

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate("/nutrition/clients")}
          className="flex items-center text-gray-500 hover:text-nutrition-600 transition-colors gap-2 group hover:cursor-pointer"
        >
          <div className="p-2 rounded-full bg-white border border-gray-200 group-hover:border-nutrition-200 group-hover:bg-nutrition-50 transition-colors shadow-sm">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">Volver a Clientes</span>
        </button>
      </div>

      {/* Main Dashboard Header */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gray-100 shadow-md ring-4 ring-white">
              <img
                src={client.avatar}
                alt={client.firstName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {client.firstName} {client.lastName}
                </h1>
              </div>
              <p className="text-gray-400 mb-3">{client.email}</p>
              <div className="flex flex-wrap gap-2">
                {client.goals?.map((goal: any, index: number) => (
                  <span
                    key={index}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium ${
                      goal.isPrimary
                        ? "bg-nutrition-50 text-nutrition-700 border border-nutrition-100"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    <Target
                      className={`w-4 h-4 ${goal.isPrimary ? "text-nutrition-600" : "text-gray-500"}`}
                    />
                    {goal.name} {goal.isPrimary && "(Principal)"}
                  </span>
                ))}
                {(!client.goals || client.goals.length === 0) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    <Target className="w-4 h-4 text-nutrition-600" />
                    {client.primaryGoal}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Critical Status */}
          <div className="flex gap-4 w-full md:w-auto">
            {client.injuries && client.injuries.length > 0 ? (
              <div className="flex-1 md:flex-none p-2 rounded-xl bg-red-50 border border-red-100 text-center min-w-[120px]">
                <div className="flex items-center justify-center gap-1.5 text-red-600 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Lesiones
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {client.injuries.length} Activas
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-xl border border-green-100 text-green-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-green-500" />
                <span className="font-medium truncate">
                  Sin lesiones activas
                </span>
              </div>
            )}

            {/* Condiciones Médicas */}
            <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-xl border border-purple-100 text-purple-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-purple-500" />
              <span
                className="font-medium truncate"
                title={
                  client.medicalConditions || "Sin condiciones registradas"
                }
              >
                {client.medicalConditions || "Sin condiciones registradas"}
              </span>
            </div>
          </div>

          {/* Columna Derecha: Métricas Metabólicas */}
          <div className="flex gap-4 justify-end">
            <div className="flex-1 max-w-[140px] p-3 rounded-2xl bg-orange-50/50 border border-orange-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-orange-600 mb-0.5">
                <Flame className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  TMB (Basal)
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">{client.bmr}</p>
              <p className="text-[10px] text-gray-500">kcal/día</p>
            </div>
            <div className="flex-1 max-w-[140px] p-3 rounded-2xl bg-nutrition-50/50 border border-nutrition-100 text-center">
              <div className="flex items-center justify-center gap-1.5 text-nutrition-600 mb-0.5">
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  TDEE (Total)
                </span>
              </div>
              <p className="text-xl font-black text-gray-900">{client.tdee}</p>
              <p className="text-[10px] text-gray-500">kcal/día</p>
            </div>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-nutrition-100 bg-[linear-gradient(135deg,rgba(240,253,250,0.92),rgba(255,255,255,0.98))] p-6 shadow-sm">
        <div className="absolute inset-y-0 right-0 hidden w-80 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.16),transparent_68%)] lg:block" />
        <div className="relative">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  type: "weight",
                  title: "Peso Corporal",
                  unit: client.metrics?.weightUnit,
                })
              }
              className="group rounded-[1.75rem] border border-white/80 bg-white/95 p-5 text-left shadow-sm shadow-nutrition-100/40 ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    Peso Actual
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-black tracking-tight text-gray-950">
                      {currentWeight > 0 ? currentWeight : "-"}
                    </span>
                    <span className="pb-1 text-sm font-medium text-gray-400">
                      {client.metrics?.weightUnit}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-2.5 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                  <Scale className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                <TrendingDown
                  className={`h-3.5 w-3.5 ${(client.metrics?.weightChange || 0) > 0 ? "rotate-180" : ""}`}
                />
                <span>
                  {Math.abs(client.metrics?.weightChange || 0).toFixed(1)} kg{" "}
                  {client.metrics?.weightChangeLabel}
                </span>
              </div>
            </button>

            <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-sm shadow-nutrition-100/40 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    Estatura
                  </p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-black tracking-tight text-gray-950">
                      {currentHeight > 0 ? currentHeight : "-"}
                    </span>
                    <span className="pb-1 text-sm font-medium text-gray-400">
                      cm
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-sky-50 p-2.5 text-sky-600">
                  <Ruler className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-gray-500">
                Referencia para indicadores antropométricos.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-sm shadow-nutrition-100/40 ring-1 ring-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">IMC</p>
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-3xl font-black tracking-tight text-gray-950">
                      {currentBmi ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-violet-50 p-2.5 text-violet-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <span
                className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${bmiDescriptor.className}`}
              >
                {bmiDescriptor.label}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedMetric({
                  type: "visceral_fat",
                  title: "Grasa Visceral",
                  unit: "Nivel",
                })
              }
              className="group rounded-[1.75rem] border border-white/80 bg-white/95 p-5 text-left shadow-sm shadow-nutrition-100/40 ring-1 ring-gray-100 transition-all hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-100/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    Grasa Visceral
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-3xl font-black tracking-tight text-gray-950">
                      {client.visceralFatLevel > 0
                        ? client.visceralFatLevel
                        : "-"}
                    </span>
                    {client.visceralFatLevel > 0 ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${visceralColor}`}
                      >
                        {client.visceralFatLevel < 10 ? "Saludable" : "Riesgo"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-2.5 text-cyan-600 transition-colors group-hover:bg-cyan-100">
                  <Droplet className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-xs font-medium text-gray-500">
                Nivel asociado al riesgo cardiometabólico.
              </p>
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section 1: Anthropometry & Composition (Visuals) - Spans 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Mediciones</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Historial completo de métricas corporales y de salud
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    navigate(`/nutrition/clients/${clientId}/measurements`)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                >
                  Ver todas
                </button>
                <button
                  onClick={() => setIsAddMeasurementModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-nutrition-600 text-white text-sm font-semibold rounded-xl hover:bg-nutrition-700 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Medición
                </button>
              </div>
            </div>

            {/* Tabs Mediciones */}
            <div className="flex space-x-6 mb-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveMeasurementTab("composition")}
                className={`pb-4 px-1 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeMeasurementTab === "composition"
                    ? "text-nutrition-600 border-b-2 border-nutrition-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Composición Corporal
              </button>
              <button
                onClick={() => setActiveMeasurementTab("health")}
                className={`pb-4 px-1 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeMeasurementTab === "health"
                    ? "text-pink-600 border-b-2 border-pink-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Métricas de Salud
              </button>
            </div>

            {activeMeasurementTab === "composition" && (
              <div className="animate-in fade-in duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-4 pb-3 font-medium">Fecha</th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Peso
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Grasa Corporal
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Masa Muscular
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {compositionRecords.length > 0 ? (
                        <AnimatePresence initial={false} mode="popLayout">
                          {paginatedCompositionRecords.map((record) => (
                            <motion.tr
                              key={record.recordId}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 72, scale: 0.985 }}
                              transition={{
                                duration: 0.38,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="cursor-pointer group transition-colors hover:bg-gray-50"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <td className="px-4 py-4 text-gray-500 whitespace-nowrap font-medium group-hover:text-nutrition-600 transition-colors">
                                {getMeasurementRecordDateLabel(record.rawDate)}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.peso ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {typeof record.peso.value === "number" &&
                                      record.peso.value % 1 !== 0
                                        ? record.peso.value.toFixed(1)
                                        : record.peso.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      kg
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.grasa ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {typeof record.grasa.value === "number" &&
                                      record.grasa.value % 1 !== 0
                                        ? record.grasa.value.toFixed(1)
                                        : record.grasa.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      %
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.musculo ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {typeof record.musculo.value ===
                                        "number" &&
                                      record.musculo.value % 1 !== 0
                                        ? record.musculo.value.toFixed(1)
                                        : record.musculo.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      kg
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    aria-label={`Editar registro del ${getMeasurementRecordDateLabel(record.rawDate)}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setMeasurementToEdit(
                                        record.sourceMeasurement,
                                      );
                                    }}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-nutrition-200 bg-nutrition-50 text-nutrition-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-nutrition-300 hover:bg-nutrition-100 hover:text-nutrition-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nutrition-200"
                                  >
                                    <PencilLine className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Eliminar registro del ${getMeasurementRecordDateLabel(record.rawDate)}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      openDeleteDialog(record);
                                    }}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500 shadow-sm transition-all duration-200 hover:scale-105 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                  >
                                    {removingRecordId === record.recordId ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            No hay mediciones corporales registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeMeasurementTab === "health" && (
              <div className="animate-in fade-in duration-300">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="px-4 pb-3 font-medium">Fecha</th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Presión Arterial
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Glucosa
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Frecuencia Cardiaca
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Saturación O2
                        </th>
                        <th className="px-4 pb-3 font-medium text-right">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {healthRecords.length > 0 ? (
                        <AnimatePresence initial={false} mode="popLayout">
                          {paginatedHealthRecords.map((record) => (
                            <motion.tr
                              key={record.recordId}
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 72, scale: 0.985 }}
                              transition={{
                                duration: 0.38,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="cursor-pointer group transition-colors hover:bg-gray-50"
                              onClick={() => setSelectedRecord(record)}
                            >
                              <td className="px-4 py-4 text-gray-500 whitespace-nowrap font-medium group-hover:text-nutrition-600 transition-colors">
                                {getMeasurementRecordDateLabel(record.rawDate)}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.presion ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {record.presion.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      mmHg
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.glucosa ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {record.glucosa.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      mg/dL
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.frecuencia ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {record.frecuencia.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      bpm
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                {record.oxigeno ? (
                                  <span>
                                    <span className="font-bold text-gray-900">
                                      {record.oxigeno.value}
                                    </span>{" "}
                                    <span className="text-xs text-gray-400">
                                      %
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button
                                  type="button"
                                  aria-label={`Eliminar registro del ${getMeasurementRecordDateLabel(record.rawDate)}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openDeleteDialog(record);
                                  }}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500 shadow-sm transition-all duration-200 hover:scale-105 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                >
                                  {removingRecordId === record.recordId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-gray-400"
                          >
                            No hay métricas de salud registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {activeGroupedMetrics.length > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Mostrar</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="min-w-[4.5rem] appearance-none rounded-lg border border-gray-200 bg-white px-3 py-1 text-center focus:outline-none focus:ring-1 focus:ring-nutrition-500"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>por página</span>
                  <span className="text-gray-400 mx-2">|</span>
                  <span>
                    Mostrando {startIndex + 1} -{" "}
                    {Math.min(
                      startIndex + itemsPerPage,
                      activeGroupedMetrics.length,
                    )}{" "}
                    de {activeGroupedMetrics.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage > 3) {
                          pageNum = currentPage - 2 + i;
                        }
                        if (pageNum > totalPages) {
                          pageNum = totalPages - (4 - i);
                        }
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            currentPage === pageNum
                              ? "bg-nutrition-600 text-white"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            {/* Tabs Header */}
            <div className="flex space-x-6 mb-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveMetricTab("antropometria")}
                className={`pb-4 px-1 text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeMetricTab === "antropometria"
                    ? "text-nutrition-600 border-b-2 border-nutrition-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Antropometría y Composición
              </button>
            </div>

            {activeMetricTab === "antropometria" && (
              <div className="animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-lg mb-6">
                  <Scale className="w-6 h-6" />
                  <h3>Antropometría y Composición</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Body Composition Details */}
                  <div
                    onClick={() =>
                      setSelectedMetric({
                        type: "composition",
                        title: "Composición Corporal",
                        unit: "",
                        series: [
                          {
                            metricType: "body_fat",
                            label: "Grasa Corporal (%)",
                            color: "#3b82f6",
                          }, // Blue
                          {
                            metricType: "muscle_mass",
                            label: "Masa Muscular (kg)",
                            color: "#a855f7",
                          }, // Purple
                          {
                            metricType: "body_water",
                            label: "Agua Corporal (%)",
                            color: "#06b6d4",
                          },
                        ],
                      })
                    }
                    className="p-5 bg-blue-50/30 rounded-2xl border border-blue-100 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-blue-800">
                        Composición
                      </h4>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-gray-600">
                            Grasa Corporal
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          {formatOptionalMetricValue(client.bodyFatPct)}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: getPercentageBarWidth(client.bodyFatPct),
                          }}
                        ></div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <span className="text-sm text-gray-600">
                            Masa Muscular
                          </span>
                        </div>
                        <span className="font-bold text-gray-900">
                          {formatOptionalMetricValue(client.muscleMassKg)} kg
                        </span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: "65%" }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Measurements */}
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-bold text-gray-700">
                        Medidas Clave
                      </h4>
                      <Ruler className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-3">
                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "waist",
                            title: "Cintura",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Cintura</span>
                        <span className="font-bold text-gray-900">
                          {client.waistCm} cm
                        </span>
                      </div>
                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "hips",
                            title: "Cadera",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Cadera</span>
                        <span className="font-bold text-gray-900">
                          {client.hipCm} cm
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100">
                        <span className="text-sm text-gray-500">
                          Relación C-C
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.waistCm && client.hipCm
                            ? (client.waistCm / client.hipCm).toFixed(2)
                            : "-"}
                        </span>
                      </div>

                      {/* Additional Measurements */}
                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "chest",
                            title: "Pecho",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Pecho</span>
                        <span className="font-bold text-gray-900">
                          {client.chestCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "cephalic",
                            title: "Cefalico",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Cefalico</span>
                        <span className="font-bold text-gray-900">
                          {client.cephalicCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "neck",
                            title: "Cuello",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Cuello</span>
                        <span className="font-bold text-gray-900">
                          {client.neckCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "mesosternal",
                            title: "Tronco central",
                            unit: "cm",
                            tabs: [
                              {
                                label: "Mesoesternal",
                                metricType: "mesosternal",
                              },
                              { label: "Umbilical", metricType: "umbilical" },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Meso/Umbilical
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.mesosternalCm || "-"}/
                          {client.umbilicalCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "arms",
                            title: "Brazos",
                            unit: "cm",
                            tabs: [
                              { label: "Izquierdo", metricType: "arm_left" },
                              { label: "Derecho", metricType: "arm_right" },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Brazo (I/D)
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.armLeftCm || "-"}/{client.armRightCm || "-"}{" "}
                          cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "relaxed_arm_midpoint",
                            title: "Brazo medio",
                            unit: "cm",
                            tabs: [
                              {
                                label: "Relajado",
                                metricType: "relaxed_arm_midpoint",
                              },
                              {
                                label: "Contraido",
                                metricType: "contracted_arm_midpoint",
                              },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Brazo medio
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.relaxedArmMidpointCm || "-"}/
                          {client.contractedArmMidpointCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "forearm",
                            title: "Antebrazo / Muneca",
                            unit: "cm",
                            tabs: [
                              { label: "Antebrazo", metricType: "forearm" },
                              { label: "Muneca", metricType: "wrist" },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Antebrazo / Muneca
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.forearmCm || "-"}/{client.wristCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "thighs",
                            title: "Muslos",
                            unit: "cm",
                            tabs: [
                              { label: "Izquierdo", metricType: "thigh_left" },
                              { label: "Derecho", metricType: "thigh_right" },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Muslo (I/D)
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.thighLeftCm || "-"}/
                          {client.thighRightCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "mid_thigh",
                            title: "Muslo medio",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Muslo medio
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.midThighCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "calves",
                            title: "Pantorrillas",
                            unit: "cm",
                            tabs: [
                              { label: "Izquierda", metricType: "calf_left" },
                              { label: "Derecha", metricType: "calf_right" },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Pantorrilla (I/D)
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.calfLeftCm || "-"}/{client.calfRightCm || "-"}{" "}
                          cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "calf",
                            title: "Pantorrilla",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Pantorrilla media
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.calfCm || "-"} cm
                        </span>
                      </div>

                      <div className="pt-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                          Diámetros
                        </p>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "biacromial",
                            title: "Biacromial",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Biacromial
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.biacromialCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "biiliocrestal",
                            title: "Biiliocrestal",
                            unit: "cm",
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Biiliocrestal
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.biiliocrestalCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "thorax_transverse",
                            title: "Tórax",
                            unit: "cm",
                            tabs: [
                              {
                                label: "Transverso",
                                metricType: "thorax_transverse",
                              },
                              {
                                label: "Anteroposterior",
                                metricType: "thorax_anteroposterior",
                              },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Tórax</span>
                        <span className="font-bold text-gray-900">
                          {client.thoraxTransverseCm || "-"}/
                          {client.thoraxAnteroposteriorCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "humerus_biepicondylar",
                            title: "Segmentos Óseos",
                            unit: "cm",
                            tabs: [
                              {
                                label: "Húmero",
                                metricType: "humerus_biepicondylar",
                              },
                              {
                                label: "Muñeca",
                                metricType: "wrist_bistyloid",
                              },
                              {
                                label: "Fémur",
                                metricType: "femur_biepicondylar",
                              },
                              {
                                label: "Bimaleolar",
                                metricType: "bimaleolar",
                              },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">
                          Seg. óseos
                        </span>
                        <span className="font-bold text-gray-900">
                          {client.humerusBiepicondylarCm || "-"}/
                          {client.wristBistyloidCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "foot_length",
                            title: "Pie",
                            unit: "cm",
                            tabs: [
                              { label: "Longitud", metricType: "foot_length" },
                              {
                                label: "Transverso",
                                metricType: "foot_transverse",
                              },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Pie</span>
                        <span className="font-bold text-gray-900">
                          {client.footLengthCm || "-"}/
                          {client.footTransverseCm || "-"} cm
                        </span>
                      </div>

                      <div
                        onClick={() =>
                          setSelectedMetric({
                            type: "hand_length",
                            title: "Mano",
                            unit: "cm",
                            tabs: [
                              { label: "Longitud", metricType: "hand_length" },
                              {
                                label: "Transverso",
                                metricType: "hand_transverse",
                              },
                            ],
                          })
                        }
                        className="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-gray-300 transition-all"
                      >
                        <span className="text-sm text-gray-500">Mano</span>
                        <span className="font-bold text-gray-900">
                          {client.handLengthCm || "-"}/
                          {client.handTransverseCm || "-"} cm
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/40 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-cyan-800">
                      Bioimpedancia
                    </h4>
                    <Zap className="h-4 w-4 text-cyan-500" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {[
                      {
                        type: "upper_body_fat" as MetricType,
                        title: "Grasa corporal superior",
                        value: formatOptionalMetricValue(
                          client.upperBodyFatPct,
                        ),
                        unit: "%",
                      },
                      {
                        type: "lower_body_fat" as MetricType,
                        title: "Grasa corporal inferior",
                        value: formatOptionalMetricValue(
                          client.lowerBodyFatPct,
                        ),
                        unit: "%",
                      },
                      {
                        type: "fat_free_mass" as MetricType,
                        title: "Masa libre de grasa",
                        value: formatOptionalMetricValue(client.fatFreeMassKg),
                        unit: "kg",
                      },
                      {
                        type: "bone_mass" as MetricType,
                        title: "Masa ósea",
                        value: formatOptionalMetricValue(client.boneMassKg),
                        unit: "kg",
                      },
                      {
                        type: "body_water" as MetricType,
                        title: "Agua corporal",
                        value: formatOptionalMetricValue(client.bodyWaterPct),
                        unit: "%",
                      },
                      {
                        type: "metabolic_age" as MetricType,
                        title: "Edad metabólica",
                        value: formatOptionalMetricValue(client.metabolicAge),
                        unit: "años",
                      },
                    ].map((metric) => (
                      <div
                        key={metric.type}
                        onClick={() =>
                          setSelectedMetric({
                            type: metric.type,
                            title: metric.title,
                            unit: metric.unit,
                          })
                        }
                        className="flex cursor-pointer items-center justify-between rounded-xl border border-white/80 bg-white px-4 py-3 shadow-sm transition-all hover:border-cyan-200 hover:bg-cyan-50"
                      >
                        <span className="text-sm text-gray-600">
                          {metric.title}
                        </span>
                        <span className="font-bold text-gray-900">
                          {metric.value}
                          {metric.value === "-" ? "" : ` ${metric.unit}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Health & Safety (Critical) */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-pink-600 font-bold text-lg mb-6">
              <Activity className="w-6 h-6" />
              <h3>Salud y Entorno</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Injuries Card */}
              <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <h4>Lesiones Activas</h4>
                </div>
                {client.injuries && client.injuries.length > 0 ? (
                  client.injuries.map((injury: any) => (
                    <div
                      key={injury.id}
                      className="flex items-center gap-2 bg-white p-3 rounded-xl border border-red-100 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-800">
                        {injury.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Sin lesiones activas reportadas.
                  </p>
                )}
              </div>

              {/* Medical Conditions Card */}
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 font-bold mb-3">
                  <AlertCircle className="w-5 h-5" />
                  <h4>Condiciones Médicas</h4>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                  <p className="text-sm font-medium text-gray-800">
                    {client.medicalConditions ||
                      "Sin condiciones médicas registradas."}
                  </p>
                </div>
              </div>

              {/* Environment Card */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 text-gray-700 font-bold mb-3">
                  <Home className="w-5 h-5" />
                  <h4>Entorno de Entrenamiento</h4>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-sm font-medium text-gray-800">
                    {client.trainingEnvironment}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Acceso completo a maquinaria y peso libre
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Nutrition & Lifestyle Context - Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-full">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-lg mb-6">
              <UtensilsCrossed className="w-6 h-6" />
              <h3>Estilo de Vida</h3>
            </div>

            {/* Biometrics */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Biométricos
              </h4>
              <div className="space-y-3">
                <div
                  onClick={() =>
                    setSelectedMetric({
                      type: "blood_pressure",
                      title: "Presión Arterial",
                      unit: "mmHg",
                      series: [
                        {
                          metricType: "systolic",
                          label: "Sistólica",
                          color: "#ec4899",
                        }, // Pink-500
                        {
                          metricType: "diastolic",
                          label: "Diastólica",
                          color: "#db2777",
                        }, // Pink-600
                      ],
                    })
                  }
                  className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100 cursor-pointer hover:bg-pink-50 hover:border-pink-200 transition-all"
                >
                  <HeartPulse className="w-5 h-5 text-pink-500" />
                  <div>
                    <p className="text-xs text-pink-500 font-medium">
                      Presión Arterial
                    </p>
                    <p className="font-bold text-gray-900">
                      {client.bloodPressure}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        mmHg
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  onClick={() =>
                    setSelectedMetric({
                      type: "glucose",
                      title: "Glucosa",
                      unit: "mg/dL",
                    })
                  }
                  className="flex items-center gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all"
                >
                  <Droplet className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-blue-500 font-medium">
                      Glucosa (Ayuno)
                    </p>
                    <p className="font-bold text-gray-900">
                      {client.glucoseLevel}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        mg/dL
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  onClick={() =>
                    setSelectedMetric({
                      type: "heart_rate",
                      title: "Frecuencia Cardiaca",
                      unit: "bpm",
                    })
                  }
                  className="flex items-center gap-3 p-3 bg-rose-50/50 rounded-2xl border border-rose-100 cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition-all"
                >
                  <Activity className="w-5 h-5 text-rose-500" />
                  <div>
                    <p className="text-xs text-rose-500 font-medium">
                      Frecuencia Cardiaca
                    </p>
                    <p className="font-bold text-gray-900">
                      {client.heartRateBpm}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        bpm
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  onClick={() =>
                    setSelectedMetric({
                      type: "oxygen_saturation",
                      title: "Saturación de Oxígeno",
                      unit: "%",
                    })
                  }
                  className="flex items-center gap-3 p-3 bg-cyan-50/50 rounded-2xl border border-cyan-100 cursor-pointer hover:bg-cyan-50 hover:border-cyan-200 transition-all"
                >
                  <HeartPulse className="w-5 h-5 text-cyan-500" />
                  <div>
                    <p className="text-xs text-cyan-500 font-medium">
                      Saturación de Oxígeno
                    </p>
                    <p className="font-bold text-gray-900">
                      {client.oxygenSaturationPct}{" "}
                      <span className="text-xs font-normal text-gray-400">
                        %
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sleep */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Sueño Promedio
                </h4>
                <div className="flex items-center gap-1 text-indigo-600">
                  <Moon className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {client.sleepHoursAvg}h
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className="bg-indigo-500 h-3 rounded-full relative"
                  style={{ width: `${(client.sleepHoursAvg / 9) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-right">Meta: 8h</p>
            </div>

            {/* Preferences */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                Preferencias Alimentarias
              </h4>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-red-500 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Alergias / Intolerancias
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.allergies &&
                      client.allergies.map((allergy: string) => (
                        <span
                          key={allergy}
                          className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100"
                        >
                          {allergy}
                        </span>
                      ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Aversiones (No le gusta)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {client.dislikes &&
                      client.dislikes.map((dislike: string) => (
                        <span
                          key={dislike}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg border border-gray-200"
                        >
                          {dislike}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {selectedMetric && client && (
        <MetricHistoryModal
          isOpen={!!selectedMetric}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.title}
          metrics={getMetricsByType(
            selectedMetric.type,
            selectedMetric.tabs,
            selectedMetric.series,
          )}
          unit={selectedMetric.unit}
          tabs={selectedMetric.tabs}
          series={selectedMetric.series}
        />
      )}

      <AddMeasurementModal
        isOpen={isAddMeasurementModalOpen}
        onClose={() => setIsAddMeasurementModalOpen(false)}
        clientId={clientId || ""}
        mode={activeMeasurementTab}
        clientGenre={historyData?.genre ?? null}
        clientDateOfBirth={historyData?.date_of_birth ?? null}
      />

      <AddMeasurementModal
        isOpen={!!measurementToEdit}
        onClose={() => setMeasurementToEdit(null)}
        clientId={clientId || ""}
        mode="composition"
        clientGenre={historyData?.genre ?? null}
        clientDateOfBirth={historyData?.date_of_birth ?? null}
        variant="edit"
        initialMeasurement={measurementToEdit}
        measurementId={measurementToEdit?.id}
        onSuccess={() => setMeasurementToEdit(null)}
      />

      <MeasurementDetailsModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord}
        historyMetrics={client.client_metrics || []}
        healthMetrics={historyData?.client_health_metrics || []}
      />

      <ConfirmDeleteDialog
        isOpen={!!recordToDelete}
        title="Eliminar registro"
        message="Este registro dejará de aparecer en el historial del paciente."
        itemName={
          recordToDelete
            ? `${recordToDelete.recordType === "measurement" ? "Medición corporal" : "Métrica de salud"} · ${getMeasurementRecordDateLabel(recordToDelete.rawDate)}`
            : undefined
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeletingRecord}
        onConfirm={handleDeleteRecord}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
