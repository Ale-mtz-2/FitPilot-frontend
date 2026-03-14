import { FormEvent, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  type Locale,
} from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Modal } from '../components/common/Modal';
import { useProfessionalClients } from '../features/professional-clients/queries';
import { useMesocycleStore } from '../store/mesocycleStore';
import { useAuthStore } from '../store/newAuthStore';
import { mesocyclesService, MacrocycleCreateData } from '../services/mesocycles';
import type { DayExercise, Macrocycle, Mesocycle, Microcycle, TrainingDay } from '../types';

type AssignedExercisePayload = Pick<
  DayExercise,
  | 'exercise_id'
  | 'order_index'
  | 'phase'
  | 'sets'
  | 'reps_min'
  | 'reps_max'
  | 'rest_seconds'
  | 'effort_type'
  | 'effort_value'
  | 'tempo'
  | 'set_type'
  | 'notes'
  | 'duration_seconds'
  | 'intensity_zone'
  | 'distance_meters'
  | 'target_calories'
  | 'intervals'
  | 'work_seconds'
  | 'interval_rest_seconds'
>;

type AssignedTrainingDayPayload = Pick<
  TrainingDay,
  'day_number' | 'date' | 'name' | 'focus' | 'rest_day' | 'notes'
> & {
  exercises: AssignedExercisePayload[];
};

type AssignedMicrocyclePayload = Pick<
  Microcycle,
  'week_number' | 'name' | 'start_date' | 'end_date' | 'intensity_level' | 'notes'
> & {
  training_days: AssignedTrainingDayPayload[];
};

type AssignedMesocyclePayload = Pick<
  Mesocycle,
  'block_number' | 'name' | 'description' | 'start_date' | 'end_date' | 'focus' | 'notes'
> & {
  microcycles: AssignedMicrocyclePayload[];
};

type AssignedMacrocyclePayload = MacrocycleCreateData & {
  client_id: string;
  mesocycles: AssignedMesocyclePayload[];
};

const pageTransition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

const getLocalDate = (value: string) => new Date(`${value}T00:00:00`);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const getStatusTone = (status: string) => {
  switch (status) {
    case 'active':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'completed':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'archived':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'draft':
    default:
      return 'border-gray-200 bg-gray-100 text-gray-700';
  }
};

const getObjectiveTone = (objective: string) => {
  switch (objective) {
    case 'strength':
    case 'power':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'fat_loss':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700';
  }
};

const formatProgramDate = (value: string, locale: Locale) => {
  const parsedDate = parseISO(value);
  if (!isValid(parsedDate)) {
    return value;
  }

  return format(parsedDate, 'PPP', { locale });
};

const getProgramDurationDays = (startDate: string, endDate: string) => {
  const start = getLocalDate(startDate);
  const end = getLocalDate(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  return Math.max(differenceInCalendarDays(end, start), 0);
};

const buildAssignedMacrocyclePayload = (
  macrocycle: Macrocycle,
  selectedClientId: string,
  assignmentStartDate: string,
): AssignedMacrocyclePayload => {
  const originalStart = getLocalDate(macrocycle.start_date);
  const originalEnd = getLocalDate(macrocycle.end_date);
  const durationMs = originalEnd.getTime() - originalStart.getTime();
  const nextStart = getLocalDate(assignmentStartDate);
  const nextEnd = new Date(nextStart.getTime() + durationMs);

  const shiftDate = (value?: string | null) => {
    if (!value) {
      return value;
    }

    const sourceDate = getLocalDate(value);
    if (Number.isNaN(sourceDate.getTime())) {
      return value;
    }

    const offsetMs = sourceDate.getTime() - originalStart.getTime();
    return format(new Date(nextStart.getTime() + offsetMs), 'yyyy-MM-dd');
  };

  const mapExercise = (exercise: DayExercise): AssignedExercisePayload => ({
    exercise_id: exercise.exercise_id,
    order_index: exercise.order_index,
    phase: exercise.phase,
    sets: exercise.sets,
    reps_min: exercise.reps_min,
    reps_max: exercise.reps_max,
    rest_seconds: exercise.rest_seconds,
    effort_type: exercise.effort_type,
    effort_value: exercise.effort_value,
    tempo: exercise.tempo,
    set_type: exercise.set_type,
    notes: exercise.notes,
    duration_seconds: exercise.duration_seconds,
    intensity_zone: exercise.intensity_zone,
    distance_meters: exercise.distance_meters,
    target_calories: exercise.target_calories,
    intervals: exercise.intervals,
    work_seconds: exercise.work_seconds,
    interval_rest_seconds: exercise.interval_rest_seconds,
  });

  const mapTrainingDay = (day: TrainingDay): AssignedTrainingDayPayload => ({
    day_number: day.day_number,
    date: shiftDate(day.date) ?? day.date,
    name: day.name,
    focus: day.focus,
    rest_day: day.rest_day,
    notes: day.notes,
    exercises: day.exercises.map(mapExercise),
  });

  const mapMicrocycle = (microcycle: Microcycle): AssignedMicrocyclePayload => ({
    week_number: microcycle.week_number,
    name: microcycle.name,
    start_date: shiftDate(microcycle.start_date) ?? microcycle.start_date,
    end_date: shiftDate(microcycle.end_date) ?? microcycle.end_date,
    intensity_level: microcycle.intensity_level,
    notes: microcycle.notes,
    training_days: microcycle.training_days.map(mapTrainingDay),
  });

  const mapMesocycle = (mesocycle: Mesocycle): AssignedMesocyclePayload => ({
    block_number: mesocycle.block_number,
    name: mesocycle.name,
    description: mesocycle.description,
    start_date: shiftDate(mesocycle.start_date) ?? mesocycle.start_date,
    end_date: shiftDate(mesocycle.end_date) ?? mesocycle.end_date,
    focus: mesocycle.focus,
    notes: mesocycle.notes,
    microcycles: mesocycle.microcycles.map(mapMicrocycle),
  });

  return {
    name: macrocycle.name,
    description: macrocycle.description ?? '',
    objective: macrocycle.objective,
    start_date: assignmentStartDate,
    end_date: format(nextEnd, 'yyyy-MM-dd'),
    client_id: selectedClientId,
    mesocycles: macrocycle.mesocycles.map(mapMesocycle),
  };
};

export function TrainingTemplatesPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['training', 'common', 'errors']);
  const {
    macrocycles = [],
    isLoadingMacrocycles,
    loadMacrocycles,
    createMacrocycle,
    deleteMacrocycle,
  } = useMesocycleStore();
  const { user } = useAuthStore();

  const professionalId = user?.id ?? '';
  const { data: clients = [] } = useProfessionalClients(professionalId);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningMacrocycle, setAssigningMacrocycle] = useState<Macrocycle | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAssigning, setIsAssigning] = useState(false);

  const dateLocale = i18n.language === 'es' ? es : enUS;
  const programs = Array.isArray(macrocycles) ? macrocycles : [];

  useEffect(() => {
    loadMacrocycles();
  }, [loadMacrocycles]);

  const summary = useMemo(() => {
    const assigned = programs.filter((program) => Boolean(program.client_id)).length;
    const templates = programs.length - assigned;

    return {
      total: programs.length,
      assigned,
      templates,
    };
  }, [programs]);

  const assignmentPreviewEndDate = useMemo(() => {
    if (!assigningMacrocycle) {
      return null;
    }

    const durationDays = getProgramDurationDays(
      assigningMacrocycle.start_date,
      assigningMacrocycle.end_date,
    );
    const previewEndDate = new Date(getLocalDate(assignStartDate).getTime());
    previewEndDate.setDate(previewEndDate.getDate() + durationDays);

    return Number.isNaN(previewEndDate.getTime())
      ? null
      : format(previewEndDate, 'PPP', { locale: dateLocale });
  }, [assignStartDate, assigningMacrocycle, dateLocale]);

  const resetAssignModal = () => {
    setAssigningMacrocycle(null);
    setSelectedClientId('');
    setAssignStartDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('common:confirmation.deleteMessage'))) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteMacrocycle(id);
      toast.success(t('training:templates.deleteSuccess'));
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('errors:training.deleteFailed')),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assigningMacrocycle || !selectedClientId) {
      return;
    }

    setIsAssigning(true);

    try {
      const fullMacrocycle = await mesocyclesService.getMacrocycleById(assigningMacrocycle.id);
      const payload = buildAssignedMacrocyclePayload(
        fullMacrocycle,
        selectedClientId,
        assignStartDate,
      );

      await createMacrocycle(payload);
      toast.success(t('training:templates.assignmentSuccess'));
      resetAssignModal();
    } catch (error) {
      toast.error(
        getErrorMessage(error, t('training:templates.assignmentError')),
      );
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoadingMacrocycles) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="flex flex-col items-center gap-4 rounded-[2rem] border border-blue-100 bg-white/90 px-10 py-12 text-center shadow-xl shadow-blue-100/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black text-gray-900">
              {t('training:templates.loadingTitle')}
            </p>
            <p className="max-w-sm text-sm font-medium text-gray-500">
              {t('training:templates.loadingDescription')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={pageTransition}
        className="relative overflow-hidden rounded-[2.75rem] border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-100 p-6 shadow-[0_30px_80px_-48px_rgba(37,99,235,0.55)] sm:p-8"
      >
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.16),_transparent_62%)]" />

        <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.24em] text-blue-700 shadow-sm shadow-blue-100/70">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                <Dumbbell className="h-4 w-4" />
              </span>
              {t('common:nav.templates')}
            </div>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
                {t('training:templates.title')}
              </h1>
              <p className="max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                {t('training:templates.subtitle')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-lg shadow-blue-100/30">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {t('training:templates.stats.total')}
                </p>
                <p className="mt-2 text-3xl font-black text-gray-950">{summary.total}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-lg shadow-blue-100/30">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {t('training:templates.stats.templates')}
                </p>
                <p className="mt-2 text-3xl font-black text-gray-950">{summary.templates}</p>
              </div>
              <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-lg shadow-blue-100/30">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {t('training:templates.stats.assigned')}
                </p>
                <p className="mt-2 text-3xl font-black text-gray-950">{summary.assigned}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/training/programs/new')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t('training:templates.new')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/training/ai-generator')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white/90 px-6 py-3.5 text-sm font-black text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
            >
              <Sparkles className="h-4 w-4" />
              {t('training:macrocycle.generateWithAi')}
            </button>
          </div>
        </div>
      </motion.section>

      {programs.length === 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...pageTransition, delay: 0.05 }}
          className="rounded-[2.5rem] border border-dashed border-blue-200 bg-white/95 px-6 py-16 text-center shadow-xl shadow-blue-100/25 sm:px-10"
        >
          <div className="mx-auto flex max-w-xl flex-col items-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-50 text-blue-500 shadow-inner shadow-blue-100">
              <CalendarDays className="h-11 w-11" />
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-tight text-gray-950">
              {t('training:templates.noTemplates')}
            </h2>
            <p className="mt-3 text-base font-medium leading-7 text-slate-500">
              {t('training:templates.description')}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-400">
              {t('training:templates.emptyHint')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/training/programs/new')}
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              {t('training:templates.createFirst')}
            </button>
          </div>
        </motion.section>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
          {programs.map((macrocycle, index) => {
            const mesocyclesCount = macrocycle.mesocycles?.length ?? 0;
            const durationDays = getProgramDurationDays(macrocycle.start_date, macrocycle.end_date);
            const durationWeeks = Math.max(Math.ceil((durationDays + 1) / 7), 1);
            const assignmentTone = macrocycle.client_id
              ? 'border-amber-200 bg-amber-50 text-amber-700'
              : 'border-blue-200 bg-blue-50 text-blue-700';

            return (
              <motion.article
                key={macrocycle.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...pageTransition, delay: index * 0.04 }}
                whileHover={{ y: -6 }}
                className="group flex h-full flex-col rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.28)] transition-all hover:border-blue-200 hover:shadow-[0_28px_65px_-30px_rgba(37,99,235,0.32)] sm:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-blue-50 text-blue-600 shadow-inner shadow-blue-100 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <Dumbbell className="h-7 w-7" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${getStatusTone(macrocycle.status)}`}>
                          {t(`common:status.${macrocycle.status}`, { defaultValue: macrocycle.status })}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${getObjectiveTone(macrocycle.objective)}`}>
                          {t(`training:objectives.${macrocycle.objective}`, {
                            defaultValue: macrocycle.objective,
                          })}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${assignmentTone}`}>
                          {macrocycle.client_id
                            ? t('training:templates.badges.assigned')
                            : t('training:templates.badges.template')}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-950">
                          {macrocycle.name}
                        </h2>
                        <p className="mt-2 min-h-[3rem] text-sm font-medium leading-6 text-slate-500">
                          {macrocycle.description || t('training:templates.defaultDescription')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(macrocycle.id)}
                    disabled={deletingId === macrocycle.id}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={t('common:buttons.delete')}
                  >
                    {deletingId === macrocycle.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      {t('training:macrocycle.startDate')}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {formatProgramDate(macrocycle.start_date, dateLocale)}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {t('training:macrocycle.endDate')}: {formatProgramDate(macrocycle.end_date, dateLocale)}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <Target className="h-4 w-4 text-blue-500" />
                      {t('training:templates.metrics.duration')}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {durationWeeks} {t('common:time.weeks')}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-400">
                      {durationDays + 1} {t('common:time.days')}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-4 sm:col-span-2">
                    <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <Layers3 className="h-4 w-4 text-blue-500" />
                      {t('training:templates.metrics.mesocycles')}
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {mesocyclesCount} {t('training:mesocycle.titlePlural').toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setAssigningMacrocycle(macrocycle)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('training:templates.assign')}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/training/programs/${macrocycle.id}`)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Pencil className="h-4 w-4" />
                    {t('common:buttons.edit')}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={Boolean(assigningMacrocycle)}
        onClose={resetAssignModal}
        title={t('training:templates.assignTitle')}
        size="lg"
        panelClassName="rounded-[2rem] border border-blue-100 bg-white/95"
      >
        {assigningMacrocycle && (
          <form onSubmit={handleAssignSubmit} className="space-y-6">
            <div className="rounded-[1.75rem] border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-500">
                    {t('training:templates.assignDescription')}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-950">
                    {assigningMacrocycle.name}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                    {assigningMacrocycle.description || t('training:templates.defaultDescription')}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t(`training:objectives.${assigningMacrocycle.objective}`, {
                    defaultValue: assigningMacrocycle.objective,
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  {t('training:templates.fields.client')}
                </span>
                <select
                  value={selectedClientId}
                  onChange={(event) => setSelectedClientId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required
                >
                  <option value="">{t('training:templates.selectClientPlaceholder')}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={String(client.id)}>
                      {`${client.name || ''} ${client.lastname || ''}`.trim() ||
                        client.email ||
                        `Cliente ${client.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  {t('training:templates.fields.startDate')}
                </span>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(event) => setAssignStartDate(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t('training:templates.fields.projectedEndDate')}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {assignmentPreviewEndDate ?? '--'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  {t('training:templates.metrics.mesocycles')}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  {(assigningMacrocycle.mesocycles?.length ?? 0)} {t('training:mesocycle.titlePlural').toLowerCase()}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetAssignModal}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                type="submit"
                disabled={!selectedClientId || isAssigning}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('training:templates.assigning')}
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    {t('training:templates.assignCta')}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
