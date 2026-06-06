import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  CreateAssetEntryBody,
  UpdateAssetEntryBody,
  CreateDebtEntryBody,
  UpdateDebtEntryBody,
} from './api';
import type { CreateSavingsEntryBody, UpdateSavingsEntryBody } from './api';

// ── Query keys ───────────────────────────────────────────────────────────────

export const QK = {
  stocks: ['stocks'] as const,
  crypto: ['crypto'] as const,
  benchmarks: ['benchmarks'] as const,
  savingsList: ['savingsList'] as const,
  savingsTarget: ['savingsTarget'] as const,
  currency: ['currency'] as const,
  assetsCurrency: ['assetsCurrency'] as const,
  debtsCurrency: ['debtsCurrency'] as const,
  exchangeRates: ['exchangeRates'] as const,
  assetHistory: ['assetHistory'] as const,
  assetEntries: ['assetEntries'] as const,
  debtHistory: ['debtHistory'] as const,
  debtEntries: ['debtEntries'] as const,
  entries: ['entries'] as const,
} as const;

// ── Queries ──────────────────────────────────────────────────────────────────

export const useStocks = () => useQuery({ queryKey: QK.stocks, queryFn: () => api.stocks.get() });
export const useCrypto = () => useQuery({ queryKey: QK.crypto, queryFn: () => api.crypto.get() });
export const useBenchmarks = () =>
  useQuery({ queryKey: QK.benchmarks, queryFn: () => api.benchmarks.get() });

export const useSavingsList = () =>
  useQuery({ queryKey: QK.savingsList, queryFn: () => api.savings.list() });
export const useSavingsTarget = () =>
  useQuery({ queryKey: QK.savingsTarget, queryFn: () => api.settings.getSavingsTarget() });
export const useCurrency = () =>
  useQuery({ queryKey: QK.currency, queryFn: () => api.settings.getCurrency() });
export const useAssetsCurrency = () =>
  useQuery({ queryKey: QK.assetsCurrency, queryFn: () => api.settings.getAssetsCurrency() });
export const useDebtsCurrency = () =>
  useQuery({ queryKey: QK.debtsCurrency, queryFn: () => api.settings.getDebtsCurrency() });
export const useExchangeRates = () =>
  useQuery({ queryKey: QK.exchangeRates, queryFn: () => api.settings.getExchangeRates() });
export const useAssetHistory = () =>
  useQuery({ queryKey: QK.assetHistory, queryFn: () => api.assets.history() });
export const useAssetEntries = () =>
  useQuery({ queryKey: QK.assetEntries, queryFn: () => api.assetEntries.list() });
export const useDebtHistory = () =>
  useQuery({ queryKey: QK.debtHistory, queryFn: () => api.debts.history() });
export const useDebtEntries = () =>
  useQuery({ queryKey: QK.debtEntries, queryFn: () => api.debtEntries.list() });
export const useEntries = () =>
  useQuery({ queryKey: QK.entries, queryFn: () => api.entries.list() });

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateSavingsEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSavingsEntryBody) => api.savings.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.savingsList }),
  });
}

export function useUpdateSavingsEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateSavingsEntryBody }) =>
      api.savings.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.savingsList }),
  });
}

export function useDeleteSavingsEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.savings.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.savingsList }),
  });
}

export function useCreateAssetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAssetEntryBody) => api.assetEntries.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.assetEntries });
      qc.invalidateQueries({ queryKey: QK.assetHistory });
    },
  });
}

export function useUpdateAssetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateAssetEntryBody }) =>
      api.assetEntries.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.assetEntries });
      qc.invalidateQueries({ queryKey: QK.assetHistory });
    },
  });
}

export function useDeleteAssetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.assetEntries.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.assetEntries });
      qc.invalidateQueries({ queryKey: QK.assetHistory });
    },
  });
}

export function useCreateDebtEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDebtEntryBody) => api.debtEntries.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.debtEntries });
      qc.invalidateQueries({ queryKey: QK.debtHistory });
    },
  });
}

export function useUpdateDebtEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: UpdateDebtEntryBody }) =>
      api.debtEntries.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.debtEntries });
      qc.invalidateQueries({ queryKey: QK.debtHistory });
    },
  });
}

export function useDeleteDebtEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.debtEntries.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.debtEntries });
      qc.invalidateQueries({ queryKey: QK.debtHistory });
    },
  });
}
