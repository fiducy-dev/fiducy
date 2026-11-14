import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requestControlPlane, withSecondFactor } from './client';

import type {
  AppKeyView,
  AppSettings,
  AppView,
  CreatedApp,
  GatewayStatus,
  UsageSeries,
  UsageSummary
} from './types';
import type { RevokedKeys } from './types';

export const queryKeys = {
  apps: ['apps'] as const,
  app: (appID: string) => ['apps', appID] as const,
  usage: (appID: string) => ['apps', appID, 'usage'] as const,
  keys: (appID: string) => ['apps', appID, 'keys'] as const,
  usageSeries: (appID: string, days: number) => ['apps', appID, 'usage', 'series', days] as const,
  config: ['config'] as const,
  twoFactor: ['two-factor'] as const,
  gatewayStatus: ['gateway-status'] as const
};

const GATEWAY_STATUS_REFRESH_MILLISECONDS = 30_000;

export function useApps() {
  return useQuery({
    queryKey: queryKeys.apps,
    queryFn: () => requestControlPlane<AppView[]>('/api/apps')
  });
}

export function useApp(appID: string) {
  return useQuery({
    queryKey: queryKeys.app(appID),
    queryFn: () => requestControlPlane<AppView>(`/api/apps/${appID}`)
  });
}

export function useUsage(appID: string) {
  return useQuery({
    queryKey: queryKeys.usage(appID),
    queryFn: () => requestControlPlane<UsageSummary>(`/api/apps/${appID}/usage`)
  });
}

export function useGatewayURL() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => requestControlPlane<{ gatewayURL: string }>('/api/config'),
    select: (config) => config.gatewayURL,
    staleTime: Number.POSITIVE_INFINITY
  });
}

export function useCreateApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AppSettings) =>
      requestControlPlane<CreatedApp>('/api/apps', {
        method: 'POST',
        body: JSON.stringify(settings)
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.apps })
  });
}

export function useUpdateApp(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: AppSettings) =>
      requestControlPlane<AppView>(`/api/apps/${appID}`, {
        method: 'PATCH',
        body: JSON.stringify(settings)
      }),
    onSuccess: (app) => {
      queryClient.setQueryData(queryKeys.app(appID), app);
      queryClient.invalidateQueries({ queryKey: queryKeys.apps, exact: true });
    }
  });
}

export function useRotateSecret(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestControlPlane<CreatedApp>(`/api/apps/${appID}/secret`, { method: 'POST' }),
    onSuccess: ({ app }) => {
      queryClient.setQueryData(queryKeys.app(appID), app);
      queryClient.invalidateQueries({ queryKey: queryKeys.apps, exact: true });
    }
  });
}

export function useDeleteApp(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      requestControlPlane<null>(`/api/apps/${appID}`, withSecondFactor('DELETE', code)),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.app(appID) });
      queryClient.invalidateQueries({ queryKey: queryKeys.apps, exact: true });
    }
  });
}

export function useFreezeApp(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isFrozen: boolean) =>
      requestControlPlane<AppView>(`/api/apps/${appID}/freeze`, {
        method: 'POST',
        body: JSON.stringify({ isFrozen })
      }),
    onSuccess: (app) => {
      queryClient.setQueryData(queryKeys.app(appID), app);
      queryClient.invalidateQueries({ queryKey: queryKeys.apps, exact: true });
    }
  });
}

export function useRevokeAllKeys(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      requestControlPlane<RevokedKeys>(`/api/apps/${appID}/keys`, withSecondFactor('DELETE', code)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.keys(appID) })
  });
}

export function useAppKeys(appID: string) {
  return useQuery({
    queryKey: queryKeys.keys(appID),
    queryFn: () => requestControlPlane<AppKeyView[]>(`/api/apps/${appID}/keys`)
  });
}

export function useRevokeKey(appID: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyID: string) =>
      requestControlPlane<{ keyID: string }>(`/api/apps/${appID}/keys/${keyID}`, {
        method: 'DELETE'
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.keys(appID) })
  });
}

export function useUsageSeries(appID: string, days = 30) {
  return useQuery({
    queryKey: queryKeys.usageSeries(appID, days),
    queryFn: () => requestControlPlane<UsageSeries>(`/api/apps/${appID}/usage/series?days=${days}`)
  });
}

export function useGatewayStatus() {
  return useQuery({
    queryKey: queryKeys.gatewayStatus,
    queryFn: () => requestControlPlane<GatewayStatus>('/api/gateway-status'),
    refetchInterval: GATEWAY_STATUS_REFRESH_MILLISECONDS
  });
}
