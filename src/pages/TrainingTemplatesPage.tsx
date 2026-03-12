import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useMesocycleStore } from '../store/mesocycleStore';
import {
  CalendarDaysIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Modal } from '../components/common/Modal';
import { useAuthStore } from '../store/newAuthStore';
import { useProfessionalClients } from '../features/professional-clients/queries';
import { mesocyclesService } from '../services/mesocycles';
import type { Macrocycle } from '../types';

export function TrainingTemplatesPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['training', 'common']);
  const {
    macrocycles = [],
    isLoadingMacrocycles,
    loadMacrocycles,
    deleteMacrocycle,
  } = useMesocycleStore();

  const programs = Array.isArray(macrocycles) ? macrocycles : [];

  const { user } = useAuthStore();
  const professionalId = user?.id || '';
  const { data: nutritionClients = [] } = useProfessionalClients(professionalId);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningMacrocycle, setAssigningMacrocycle] = useState<Macrocycle | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [assignStartDate, setAssignStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isAssigning, setIsAssigning] = useState(false);
  const dateLocale = i18n.language === 'es' ? es : enUS;

  useEffect(() => {
    loadMacrocycles();
  }, [loadMacrocycles]);

  const handleDelete = async (id: string, _name: string) => {
    if (!confirm(t('common:confirmation.deleteMessage'))) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteMacrocycle(id);
      toast.success(t('training:messages.programUpdated'));
    } catch (error: any) {
      toast.error(error.message || t('errors:training.deleteFailed'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningMacrocycle || !selectedClientId) return;

    setIsAssigning(true);
    try {
      // Fetch full macrocycle details to duplicate
      const fullMacrocycle = await mesocyclesService.getMacrocycleById(assigningMacrocycle.id);

      const origStart = new Date(fullMacrocycle.start_date + 'T00:00:00');
      const origEnd = new Date(fullMacrocycle.end_date + 'T00:00:00');
      const durationMs = origEnd.getTime() - origStart.getTime();

      const newStart = new Date(assignStartDate + 'T00:00:00');
      const newEnd = new Date(newStart.getTime() + durationMs);

      // Map nested data to omit IDs
      const mapMesocycle = (meso: any) => ({
        block_number: meso.block_number,
        name: meso.name,
        description: meso.description,
        start_date: meso.start_date,
        end_date: meso.end_date,
        focus: meso.focus,
        notes: meso.notes,
        microcycles: (meso.microcycles || []).map(mapMicrocycle)
      });

      const mapMicrocycle = (micro: any) => ({
        week_number: micro.week_number,
        name: micro.name,
        start_date: micro.start_date,
        end_date: micro.end_date,
        intensity_level: micro.intensity_level,
        notes: micro.notes,
        training_days: (micro.training_days || []).map(mapTrainingDay)
      });

      const mapTrainingDay = (day: any) => ({
        day_number: day.day_number,
        date: day.date,
        name: day.name,
        focus: day.focus,
        rest_day: day.rest_day,
        notes: day.notes,
        exercises: (day.exercises || []).map(mapExercise)
      });

      const mapExercise = (ex: any) => ({
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        phase: ex.phase,
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        rest_seconds: ex.rest_seconds,
        effort_type: ex.effort_type,
        effort_value: ex.effort_value,
        tempo: ex.tempo,
        set_type: ex.set_type,
        notes: ex.notes,
        duration_seconds: ex.duration_seconds,
        intensity_zone: ex.intensity_zone,
        distance_meters: ex.distance_meters,
        target_calories: ex.target_calories,
        intervals: ex.intervals,
        work_seconds: ex.work_seconds,
        interval_rest_seconds: ex.interval_rest_seconds
      });

      const newMacrocycleData = {
        name: `${fullMacrocycle.name}`,
        description: fullMacrocycle.description || '',
        objective: fullMacrocycle.objective,
        start_date: assignStartDate,
        end_date: format(newEnd, 'yyyy-MM-dd'),
        client_id: selectedClientId,
        mesocycles: (fullMacrocycle.mesocycles || []).map(mapMesocycle)
      };

      await mesocyclesService.createMacrocycle(newMacrocycleData);
      toast.success('Programa asignado correctamente');
      setAssigningMacrocycle(null);
      setSelectedClientId('');
      loadMacrocycles();
    } catch (error: any) {
      toast.error(error.message || 'Error al asignar plantilla');
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'archived':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoadingMacrocycles) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('training:templates.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('training:templates.subtitle')}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate('/training/programs/new')}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('training:templates.new')}
        </Button>
      </div>

      {/* Programs Grid */}
      {programs.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('training:templates.noTemplates')}
            </h3>
            <p className="max-w-md mx-auto mb-6">
              {t('training:templates.description')}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/training/programs/new')}
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('training:templates.createFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((macrocycle) => (
            <Card key={macrocycle.id} padding="none">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {macrocycle.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          macrocycle.status
                        )}`}
                      >
                        {t(`common:status.${macrocycle.status}`)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t(`training:objectives.${macrocycle.objective}`, macrocycle.objective)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${macrocycle.client_id ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}
                      >
                        {macrocycle.client_id ? 'Asignado' : 'Plantilla'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {macrocycle.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {macrocycle.description}
                  </p>
                )}

                {/* Dates */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">{t('training:macrocycle.startDate')}:</span>
                    {format(new Date(macrocycle.start_date), 'PPP', { locale: dateLocale })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium mr-2">{t('training:macrocycle.endDate')}:</span>
                    {format(new Date(macrocycle.end_date), 'PPP', { locale: dateLocale })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span>{macrocycle.mesocycles?.length || 0} {t('training:mesocycle.titlePlural').toLowerCase()}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setAssigningMacrocycle(macrocycle)}
                    className="flex-1"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-1" />
                    Asignar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/training/programs/${macrocycle.id}`)}
                    className="flex-1"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    {t('common:buttons.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(macrocycle.id, macrocycle.name)}
                    isLoading={deletingId === macrocycle.id}
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <Modal
        isOpen={!!assigningMacrocycle}
        onClose={() => setAssigningMacrocycle(null)}
        title="Asignar a Cliente"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4 shadow-none">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Seleccionar cliente...</option>
              {nutritionClients.map((client) => (
                <option key={client.id} value={String(client.id)}>
                  {`${client.name || ''} ${client.lastname || ''}`.trim() || client.email || `Cliente ${client.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={assignStartDate}
              onChange={(e) => setAssignStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAssigningMacrocycle(null)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isAssigning}
              disabled={!selectedClientId}
            >
              Asignar Programa
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
