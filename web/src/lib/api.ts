import type { Entry, SavingsEntry, Asset, Debt } from './storage';

// ── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Request body types ───────────────────────────────────────────────────────

export type CreateEntryBody = Omit<Entry, 'id' | 'createdAt'>;
export type UpdateEntryBody = Partial<Omit<Entry, 'id' | 'createdAt'>>;

export type CreateSavingsEntryBody = Omit<SavingsEntry, 'id' | 'updatedAt'>;
export type UpdateSavingsEntryBody = Partial<Omit<SavingsEntry, 'id' | 'updatedAt'>>;

// ── Core HTTP client ─────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function get<T>(path: string) {
  return request<T>(path);
}
function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}
function put<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}
function del<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

// ── /api/entries ─────────────────────────────────────────────────────────────

const entries = {
  list: () => get<Entry[]>('/api/entries'),
  get: (id: number) => get<Entry>(`/api/entries/${id}`),
  create: (body: CreateEntryBody) => post<Entry>('/api/entries', body),
  update: (id: number, body: UpdateEntryBody) => put<Entry>(`/api/entries/${id}`, body),
  remove: (id: number) => del<void>(`/api/entries/${id}`),
};

// ── /api/savings ─────────────────────────────────────────────────────────────

const savings = {
  list: () => get<SavingsEntry[]>('/api/savings'),
  get: (id: number) => get<SavingsEntry>(`/api/savings/${id}`),
  create: (body: CreateSavingsEntryBody) => post<SavingsEntry>('/api/savings', body),
  update: (id: number, body: UpdateSavingsEntryBody) =>
    put<SavingsEntry>(`/api/savings/${id}`, body),
  remove: (id: number) => del<void>(`/api/savings/${id}`),
};

// ── /api/upload ──────────────────────────────────────────────────────────────

async function uploadCSV(file: File): Promise<Entry[]> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/upload/csv`, { method: 'POST', body: form });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<Entry[]>;
}

async function uploadSavingsCSV(file: File): Promise<SavingsEntry[]> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/upload/savings-csv`, { method: 'POST', body: form });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<SavingsEntry[]>;
}

async function uploadHistoryCSV(endpoint: string, file: File): Promise<{ imported: number }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}${endpoint}`, { method: 'POST', body: form });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<{ imported: number }>;
}

const upload = {
  csv: uploadCSV,
  csvTemplateURL: (): string => `${BASE}/api/upload/csv/template`,
  savingsCsv: uploadSavingsCSV,
  savingsCsvTemplateURL: (): string => `${BASE}/api/upload/savings-csv/template`,
  assetHistoryCsv: (file: File) => uploadHistoryCSV('/api/upload/asset-history-csv', file),
  assetHistoryCsvTemplateURL: (): string => `${BASE}/api/upload/asset-history-csv/template`,
  debtHistoryCsv: (file: File) => uploadHistoryCSV('/api/upload/debt-history-csv', file),
  debtHistoryCsvTemplateURL: (): string => `${BASE}/api/upload/debt-history-csv/template`,
};

// ── /api/stocks ──────────────────────────────────────────────────────────

export interface StockData {
  months: string[];
  invested: number[];
  return: number[];
  gain: number[];
  roi: (number | null)[];
  allocation: number[];
  currentValue: number;
  totalRoi: number | null;
}

const stocks = {
  get: () => get<StockData>('/api/stocks'),
};

// ── /api/crypto ──────────────────────────────────────────────────────────

export interface CryptoData {
  months: string[];
  invested: number[];
  return: number[];
  gain: number[];
  roi: (number | null)[];
  allocation: number[];
  currentValue: number;
  totalRoi: number | null;
}

const crypto = {
  get: () => get<CryptoData>('/api/crypto'),
};

// ── /api/benchmarks ──────────────────────────────────────────────────────────

export interface YearlyBenchmark {
  spxReturn: number | null;
  nasdaqReturn: number | null;
  vwceReturn: number | null;
}

export interface BenchmarkData {
  months: string[];
  spxRoi: (number | null)[];
  nasdaqRoi: (number | null)[];
  vwceRoi: (number | null)[];
  yearlyBenchmarks: Record<string, YearlyBenchmark>;
}

const benchmarksApi = {
  get: () => get<BenchmarkData>('/api/benchmarks'),
};

// ── /api/settings ────────────────────────────────────────────────────────────

export interface SavingsTargetSetting {
  key: string;
  value: number;
}

export interface CurrencySetting {
  key: string;
  value: string;
}

export interface ExchangeRates {
  usdToRon: number;
  eurToRon: number;
}

const settings = {
  getSavingsTarget: () => get<SavingsTargetSetting>('/api/settings/savings-target'),
  setSavingsTarget: (value: number) =>
    post<SavingsTargetSetting>('/api/settings/savings-target', { value }),
  getCurrency: () => get<CurrencySetting>('/api/settings/currency'),
  setCurrency: (value: string) => post<CurrencySetting>('/api/settings/currency', { value }),
  getAssetsCurrency: () => get<CurrencySetting>('/api/settings/assets-currency'),
  setAssetsCurrency: (value: string) =>
    post<CurrencySetting>('/api/settings/assets-currency', { value }),
  getDebtsCurrency: () => get<CurrencySetting>('/api/settings/debts-currency'),
  setDebtsCurrency: (value: string) =>
    post<CurrencySetting>('/api/settings/debts-currency', { value }),
  getExchangeRates: () => get<ExchangeRates>('/api/settings/exchange-rates'),
  setExchangeRates: (rates: ExchangeRates) =>
    post<ExchangeRates>('/api/settings/exchange-rates', rates),
};

// ── /api/info ────────────────────────────────────────────────────────────────

export interface ServerInfo {
  dbPath: string;
}

const info = () => get<ServerInfo>('/api/info');

// ── /api/assets ──────────────────────────────────────────────────────────────

export interface AssetHistoryPoint {
  date: string;
  totalValue: number;
}
export type CreateAssetBody = Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateAssetBody = Partial<CreateAssetBody>;

const assetApi = {
  list: () => get<Asset[]>('/api/assets'),
  get: (id: number) => get<Asset>(`/api/assets/${id}`),
  history: () => get<AssetHistoryPoint[]>('/api/assets/history'),
  snapshot: (label?: string) => post<void>('/api/assets/snapshot', { label: label ?? '' }),
  create: (body: CreateAssetBody) => post<Asset>('/api/assets', body),
  update: (id: number, body: UpdateAssetBody) => put<Asset>(`/api/assets/${id}`, body),
  remove: (id: number) => del<void>(`/api/assets/${id}`),
};

// ── /api/asset-entries ───────────────────────────────────────────────────────

export interface AssetEntry {
  id: number;
  date: string;
  name: string;
  category: string;
  amount: number;
  note: string;
  createdAt: string;
}
export type CreateAssetEntryBody = Omit<AssetEntry, 'id' | 'createdAt'>;
export type UpdateAssetEntryBody = Omit<AssetEntry, 'id' | 'createdAt'>;

const assetEntries = {
  list: (date?: string) =>
    get<AssetEntry[]>(`/api/asset-entries${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  create: (body: CreateAssetEntryBody) => post<AssetEntry>('/api/asset-entries', body),
  update: (id: number, body: UpdateAssetEntryBody) => put<void>(`/api/asset-entries/${id}`, body),
  remove: (id: number) => del<void>(`/api/asset-entries/${id}`),
};

// ── /api/debts ───────────────────────────────────────────────────────────────

export interface DebtHistoryPoint {
  date: string;
  totalDebt: number;
}
export type CreateDebtBody = Omit<Debt, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDebtBody = Partial<CreateDebtBody>;

const debtApi = {
  list: () => get<Debt[]>('/api/debts'),
  get: (id: number) => get<Debt>(`/api/debts/${id}`),
  history: () => get<DebtHistoryPoint[]>('/api/debts/history'),
  snapshot: (label?: string) => post<void>('/api/debts/snapshot', { label: label ?? '' }),
  create: (body: CreateDebtBody) => post<Debt>('/api/debts', body),
  update: (id: number, body: UpdateDebtBody) => put<Debt>(`/api/debts/${id}`, body),
  remove: (id: number) => del<void>(`/api/debts/${id}`),
};

// ── /api/debt-entries ────────────────────────────────────────────────────────

export interface DebtEntry {
  id: number;
  date: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  note: string;
  createdAt: string;
}
export type CreateDebtEntryBody = Omit<DebtEntry, 'id' | 'createdAt'>;
export type UpdateDebtEntryBody = Omit<DebtEntry, 'id' | 'createdAt'>;

const debtEntries = {
  list: (date?: string) =>
    get<DebtEntry[]>(`/api/debt-entries${date ? `?date=${encodeURIComponent(date)}` : ''}`),
  create: (body: CreateDebtEntryBody) => post<DebtEntry>('/api/debt-entries', body),
  update: (id: number, body: UpdateDebtEntryBody) => put<void>(`/api/debt-entries/${id}`, body),
  remove: (id: number) => del<void>(`/api/debt-entries/${id}`),
};

// ── /api/init-month ──────────────────────────────────────────────────────────

const initMonth = () => post<void>('/api/init-month', {});

// ── Public surface ───────────────────────────────────────────────────────────

export const api = {
  entries,
  savings,
  upload,
  stocks,
  crypto,
  settings,
  assets: assetApi,
  debts: debtApi,
  debtEntries,
  assetEntries,
  initMonth,
  info,
  benchmarks: benchmarksApi,
};
