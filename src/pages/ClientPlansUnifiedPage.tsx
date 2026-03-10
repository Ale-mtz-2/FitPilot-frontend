import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useProfessional } from '@/contexts/ProfessionalContext';
import { useAuthStore } from '@/store/newAuthStore';
import { useMesocycleStore } from '@/store/mesocycleStore';
import { useGetMenuPool } from '@/features/menus/queries';
import type { IMenuPool } from '@/features/menus/types';
import { useProfessionalClients } from '@/features/professional-clients/queries';
import type { IProfessionalClient } from '@/features/professional-clients/types';
import { resolvePlanAccess } from '@/features/subscriptions/planAccess';
import type { Macrocycle } from '@/types';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';

type ClientPlansGroup = {
  client: IProfessionalClient | null;
  clientId: string;
  trainingPrograms: Macrocycle[];
  latestTrainingProgram: Macrocycle | null;
  nutritionMenus: IMenuPool[];
  latestNutritionMenu: IMenuPool | null;
};

type ClientSearchOption = {
  id: string;
  name: string;
};

const normalizeClientId = (value: unknown): string => String(value ?? '').trim();

const parseClientNumericId = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const getProgramSortScore = (program: Macrocycle): number => {
  const createdAt = Date.parse(program.created_at || '');
  if (!Number.isNaN(createdAt)) return createdAt;

  const updatedAt = Date.parse(program.updated_at || '');
  if (!Number.isNaN(updatedAt)) return updatedAt;

  const numericId = Number(program.id);
  return Number.isFinite(numericId) ? numericId : 0;
};

const getMenuSortScore = (menu: IMenuPool): number => {
  const assignedStartDate = Date.parse(menu.assigned_start_date || '');
  if (!Number.isNaN(assignedStartDate)) return assignedStartDate;

  const assignedDate = Date.parse(menu.assigned_date || '');
  if (!Number.isNaN(assignedDate)) return assignedDate;

  const createdAt = Date.parse(menu.created_at || '');
  if (!Number.isNaN(createdAt)) return createdAt;

  return Number(menu.id) || 0;
};

export function ClientPlansUnifiedPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { professional, userData } = useProfessional();
  const { user } = useAuthStore();
  const accessUser = userData ?? user ?? null;
  const planAccess = resolvePlanAccess(accessUser);
  const canAccessTraining = planAccess.canAccessTraining;
  const canAccessNutrition = planAccess.canAccessNutrition;
  const professionalId = accessUser?.id
    ? Number(accessUser.id)
    : professional?.sub
      ? Number(professional.sub)
      : undefined;

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const {
    macrocycles,
    isLoadingMacrocycles,
    loadMacrocycles,
  } = useMesocycleStore();

  useEffect(() => {
    if (!canAccessTraining) {
      return;
    }
    void loadMacrocycles();
  }, [canAccessTraining, loadMacrocycles]);

  const {
    data: professionalClients = [],
    isLoading: isLoadingClients,
  } = useProfessionalClients(professionalId ?? '');

  const {
    data: menuPoolData,
    isLoading: isLoadingMenus,
  } = useGetMenuPool(canAccessNutrition ? professionalId : undefined);

  const menus = useMemo<IMenuPool[]>(
    () => (Array.isArray(menuPoolData) ? (menuPoolData as IMenuPool[]) : []),
    [menuPoolData],
  );

  const resolveClientName = useCallback((client: IProfessionalClient | null, fallbackId: string) => {
    if (!client) {
      return t('clientPlansPage.unknownClient', { clientId: fallbackId });
    }

    const fullName = [client.name, client.lastname].filter(Boolean).join(' ').trim();
    return fullName || client.email || t('clientPlansPage.unknownClient', { clientId: fallbackId });
  }, [t]);

  const translateStatus = (status: string | null | undefined): string => {
    if (!status) {
      return '';
    }

    return t(`status.${status.toLowerCase()}`, { defaultValue: status });
  };

  const clientsById = useMemo(() => {
    const clientMap = new Map<string, IProfessionalClient>();
    professionalClients.forEach((client) => {
      clientMap.set(normalizeClientId(client.id), client);
    });
    return clientMap;
  }, [professionalClients]);

  const trainingByClient = useMemo(() => {
    const groups = new Map<string, Macrocycle[]>();
    if (!canAccessTraining) {
      return groups;
    }

    macrocycles.forEach((macrocycle) => {
      const clientId = normalizeClientId(macrocycle.client_id);
      if (!clientId) {
        return;
      }

      const current = groups.get(clientId) || [];
      current.push(macrocycle);
      groups.set(clientId, current);
    });

    groups.forEach((clientPrograms, clientId) => {
      const sortedPrograms = [...clientPrograms].sort((a, b) => getProgramSortScore(b) - getProgramSortScore(a));
      groups.set(clientId, sortedPrograms);
    });

    return groups;
  }, [canAccessTraining, macrocycles]);

  const nutritionByClient = useMemo(() => {
    const groups = new Map<string, IMenuPool[]>();
    if (!canAccessNutrition) {
      return groups;
    }

    menus.forEach((menu) => {
      const clientId = normalizeClientId(menu.client_id);
      if (!clientId) {
        return;
      }

      const current = groups.get(clientId) || [];
      current.push(menu);
      groups.set(clientId, current);
    });

    groups.forEach((clientMenus, clientId) => {
      const sortedMenus = [...clientMenus].sort((a, b) => getMenuSortScore(b) - getMenuSortScore(a));
      groups.set(clientId, sortedMenus);
    });

    return groups;
  }, [canAccessNutrition, menus]);

  const groupedClients = useMemo<ClientPlansGroup[]>(() => {
    const ids = new Set<string>();
    trainingByClient.forEach((_value, key) => ids.add(key));
    nutritionByClient.forEach((_value, key) => ids.add(key));

    return Array.from(ids)
      .map((clientId) => {
        const trainingPrograms = trainingByClient.get(clientId) || [];
        const nutritionMenus = nutritionByClient.get(clientId) || [];
        const latestTrainingProgram = trainingPrograms[0] || null;
        const latestNutritionMenu = nutritionMenus[0] || null;

        return {
          client: clientsById.get(clientId) || null,
          clientId,
          trainingPrograms,
          latestTrainingProgram,
          nutritionMenus,
          latestNutritionMenu,
        };
      })
      .sort((a, b) => {
        const aScore = Math.max(
          a.latestTrainingProgram ? getProgramSortScore(a.latestTrainingProgram) : 0,
          a.latestNutritionMenu ? getMenuSortScore(a.latestNutritionMenu) : 0,
        );
        const bScore = Math.max(
          b.latestTrainingProgram ? getProgramSortScore(b.latestTrainingProgram) : 0,
          b.latestNutritionMenu ? getMenuSortScore(b.latestNutritionMenu) : 0,
        );
        return bScore - aScore;
      });
  }, [clientsById, nutritionByClient, trainingByClient]);

  const filteredGroups = useMemo(() => {
    if (!selectedClientId) {
      return groupedClients;
    }

    return groupedClients.filter((group) => group.clientId === selectedClientId);
  }, [groupedClients, selectedClientId]);

  const selectableClients = useMemo<ClientSearchOption[]>(() => {
    const options = groupedClients.map((group) => ({
      id: group.clientId,
      name: resolveClientName(group.client, group.clientId),
    }));

    const query = clientSearch.trim().toLowerCase();
    if (!query) {
      return options;
    }

    return options.filter((client) => client.name.toLowerCase().includes(query));
  }, [clientSearch, groupedClients, resolveClientName]);

  const selectedClient = groupedClients.find((group) => group.clientId === selectedClientId) || null;
  const selectedClientLabel = selectedClient
    ? resolveClientName(selectedClient.client, selectedClient.clientId)
    : null;

  const isLoadingPlans =
    (canAccessTraining && isLoadingMacrocycles) ||
    (canAccessNutrition && isLoadingMenus);
  const isLoadingPage = isLoadingClients || isLoadingPlans;

  if (isLoadingPage) {
    return (
      <Card>
        <div className="flex min-h-[16rem] items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('clientPlansPage.title')}</h1>
          <p className="mt-1 text-gray-600">{t('clientPlansPage.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsClientModalOpen(true)}>
            <MagnifyingGlassIcon className="mr-2 h-5 w-5" />
            {selectedClientLabel || t('clientPlansPage.searchClient')}
          </Button>
          {selectedClientId ? (
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedClientId(null);
                setClientSearch('');
              }}
              className="text-gray-600"
            >
              {t('clientPlansPage.clearFilter')}
            </Button>
          ) : null}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-blue-300" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900">{t('clientPlansPage.emptyTitle')}</h3>
            <p className="mx-auto mt-2 max-w-lg text-gray-600">{t('clientPlansPage.emptyDescription')}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredGroups.map((group) => {
            const weeklyViewClientId = group.client?.id ?? parseClientNumericId(group.clientId);
            return (
              <Card key={group.clientId}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <UserIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-gray-900">
                        {resolveClientName(group.client, group.clientId)}
                      </h3>
                    </div>
                  </div>

                  {canAccessTraining ? (
                    <div className="space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-blue-900">
                          {t('clientPlansPage.sections.training')}
                        </p>
                        {group.latestTrainingProgram ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {translateStatus(group.latestTrainingProgram.status)}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-blue-800">
                        {t('clientPlansPage.training.count', { count: group.trainingPrograms.length })}
                      </p>
                      {group.trainingPrograms.length === 0 ? (
                        <p className="text-sm text-blue-800">{t('clientPlansPage.training.empty')}</p>
                      ) : (
                        <div className="space-y-1 text-sm text-blue-900">
                          {group.trainingPrograms.slice(0, 2).map((program) => (
                            <p key={program.id} className="truncate">- {program.name}</p>
                          ))}
                          {group.trainingPrograms.length > 2 ? (
                            <p className="text-xs text-blue-700">
                              {t('clientPlansPage.training.more', { count: group.trainingPrograms.length - 2 })}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <Button
                        variant="primary"
                        className="w-full"
                        disabled={!group.latestTrainingProgram}
                        onClick={() => {
                          if (!group.latestTrainingProgram) {
                            return;
                          }
                          navigate(`/training/programs/${group.latestTrainingProgram.id}`);
                        }}
                      >
                        {t('clientPlansPage.training.openLatest')}
                      </Button>
                    </div>
                  ) : null}

                  {canAccessNutrition ? (
                    <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-emerald-900">
                          {t('clientPlansPage.sections.nutrition')}
                        </p>
                      </div>
                      <p className="text-xs text-emerald-800">
                        {t('clientPlansPage.nutrition.count', { count: group.nutritionMenus.length })}
                      </p>
                      {group.nutritionMenus.length === 0 ? (
                        <p className="text-sm text-emerald-800">{t('clientPlansPage.nutrition.empty')}</p>
                      ) : (
                        <div className="space-y-1 text-sm text-emerald-900">
                          {group.nutritionMenus.slice(0, 2).map((menu) => (
                            <p key={menu.id} className="truncate">- {menu.title}</p>
                          ))}
                          {group.nutritionMenus.length > 2 ? (
                            <p className="text-xs text-emerald-700">
                              {t('clientPlansPage.nutrition.more', { count: group.nutritionMenus.length - 2 })}
                            </p>
                          ) : null}
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled={!weeklyViewClientId}
                        onClick={() => {
                          if (!weeklyViewClientId) {
                            return;
                          }
                          navigate(`/nutrition/meal-plans/clients-menus/weekly-view/${weeklyViewClientId}`);
                        }}
                      >
                        {t('clientPlansPage.nutrition.viewWeekly')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        title={t('clientPlansPage.searchClient')}
        size="lg"
      >
        <div className="space-y-4">
          <input
            type="text"
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
            placeholder={t('clientPlansPage.searchPlaceholder')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <div className="max-h-72 space-y-2 overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedClientId(null);
                setIsClientModalOpen(false);
              }}
              className="w-full rounded-lg border border-dashed border-gray-300 p-3 text-left text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50"
            >
              {t('clientPlansPage.allClients')}
            </button>

            {selectableClients.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() => {
                  setSelectedClientId(client.id);
                  setIsClientModalOpen(false);
                }}
                className="w-full rounded-lg border border-gray-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-medium text-gray-900">{client.name}</p>
              </button>
            ))}
            {selectableClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">{t('clientPlansPage.noResults')}</p>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}
