import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requestControlPlane } from './client';
import { queryKeys } from './queries';

import type { TwoFactorEnrollment, TwoFactorStatus } from './types';

export function useTwoFactorStatus() {
  return useQuery({
    queryKey: queryKeys.twoFactor,
    queryFn: () => requestControlPlane<TwoFactorStatus>('/api/two-factor')
  });
}

export function useStartTwoFactor() {
  return useMutation({
    mutationFn: () =>
      requestControlPlane<TwoFactorEnrollment>('/api/two-factor', { method: 'POST' })
  });
}

export function useConfirmTwoFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) =>
      requestControlPlane<TwoFactorStatus>('/api/two-factor/confirm', {
        method: 'POST',
        body: JSON.stringify({ code })
      }),
    onSuccess: (status) => queryClient.setQueryData(queryKeys.twoFactor, status)
  });
}
