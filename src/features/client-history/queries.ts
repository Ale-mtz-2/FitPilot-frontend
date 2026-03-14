import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteClientHealthMetric,
  deleteMeasurement,
  getClientHealthMetrics,
  getClientHistory,
  getClientMetrics,
  getMeasurementDetail,
  saveClientHealthMetric,
  saveClientMetric,
  updateMeasurement,
} from "./api";
import {
  CreateMeasurementPayload,
  IHistoryClient,
  MeasurementDetailResponse,
  MeasurementMutationPayload,
} from "./types";

type UpdateMeasurementMutationArgs = {
  measurementId: number | string;
  payload: MeasurementMutationPayload;
};

export const useClientHistory = (
  clientId?: number | string,
  page: number = 1,
  limit: number = 10,
) => {
  return useQuery<IHistoryClient, Error>({
    queryKey: ["client-history", clientId, page, limit],
    queryFn: () => getClientHistory(clientId!, page, limit),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });
};

export const useSaveClientMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricData: CreateMeasurementPayload) =>
      saveClientMetric(metricData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-metrics"] });
    },
  });
};

export const useUpdateMeasurement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ measurementId, payload }: UpdateMeasurementMutationArgs) =>
      updateMeasurement(measurementId, payload),
    onSuccess: (_, { measurementId }) => {
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-metrics"] });
      queryClient.invalidateQueries({
        queryKey: ["measurement-detail", measurementId],
      });
    },
  });
};

export const useMeasurementDetail = (
  measurementId?: number | string,
  enabled: boolean = true,
) => {
  return useQuery<MeasurementDetailResponse, Error>({
    queryKey: ["measurement-detail", measurementId],
    queryFn: () => getMeasurementDetail(measurementId!),
    enabled: enabled && !!measurementId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useDeleteMeasurement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (measurementId: number | string) =>
      deleteMeasurement(measurementId),
    onSuccess: (_, measurementId) => {
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-metrics"] });
      queryClient.removeQueries({
        queryKey: ["measurement-detail", measurementId],
      });
    },
  });
};

export const useSaveClientHealthMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricData: any) => saveClientHealthMetric(metricData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-health-metrics"] });
    },
  });
};

export const useDeleteClientHealthMetric = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metricId: number | string) =>
      deleteClientHealthMetric(metricId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-history"] });
      queryClient.invalidateQueries({ queryKey: ["client-health-metrics"] });
    },
  });
};

export const useClientMetricsQuery = (
  userId?: number | string,
  page: number = 1,
  limit: number = 20,
) => {
  return useQuery<any, Error>({
    queryKey: ["client-metrics", userId, page, limit],
    queryFn: () => getClientMetrics(userId!, page, limit),
    enabled: !!userId,
  });
};

export const useClientHealthMetricsQuery = (
  userId?: number | string,
  page: number = 1,
  limit: number = 20,
) => {
  return useQuery<any, Error>({
    queryKey: ["client-health-metrics", userId, page, limit],
    queryFn: () => getClientHealthMetrics(userId!, page, limit),
    enabled: !!userId,
  });
};
