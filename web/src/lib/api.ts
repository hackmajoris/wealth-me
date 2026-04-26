import type { Entry, SavingsEntry } from "./storage";

// ── Error ────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// ── Request body types ───────────────────────────────────────────────────────

export type CreateEntryBody = Omit<Entry, "id" | "createdAt">;
export type UpdateEntryBody = Partial<Omit<Entry, "id" | "createdAt">>;

export type CreateSavingsEntryBody = Omit<SavingsEntry, "id" | "updatedAt">;
export type UpdateSavingsEntryBody = Partial<Omit<SavingsEntry, "id" | "updatedAt">>;

// ── Core HTTP client ─────────────────────────────────────────────────────────

const BASE = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function get<T>(path: string) { return request<T>(path); }
function post<T>(path: string, body: unknown) { return request<T>(path, { method: "POST",  body: JSON.stringify(body) }); }
function put<T>(path: string, body: unknown)  { return request<T>(path, { method: "PUT",   body: JSON.stringify(body) }); }
function del<T>(path: string)                 { return request<T>(path, { method: "DELETE" }); }

// ── /api/entries ─────────────────────────────────────────────────────────────

const entries = {
  list:   ()                                   => get<Entry[]>("/api/entries"),
  get:    (id: number)                         => get<Entry>(`/api/entries/${id}`),
  create: (body: CreateEntryBody)              => post<Entry>("/api/entries", body),
  update: (id: number, body: UpdateEntryBody)  => put<Entry>(`/api/entries/${id}`, body),
  remove: (id: number)                         => del<void>(`/api/entries/${id}`),
};

// ── /api/savings ─────────────────────────────────────────────────────────────

const savings = {
  list:   ()                                           => get<SavingsEntry[]>("/api/savings"),
  get:    (id: number)                                 => get<SavingsEntry>(`/api/savings/${id}`),
  create: (body: CreateSavingsEntryBody)               => post<SavingsEntry>("/api/savings", body),
  update: (id: number, body: UpdateSavingsEntryBody)   => put<SavingsEntry>(`/api/savings/${id}`, body),
  remove: (id: number)                                 => del<void>(`/api/savings/${id}`),
};

// ── /api/upload ──────────────────────────────────────────────────────────────

async function uploadCSV(file: File): Promise<Entry[]> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/upload/csv`, { method: "POST", body: form });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<Entry[]>;
}

const upload = {
  csv: uploadCSV,
  csvTemplateURL: (): string => `${BASE}/api/upload/csv/template`,
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
  get: () => get<StockData>("/api/stocks"),
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
  get: () => get<CryptoData>("/api/crypto"),
};

// ── Public surface ───────────────────────────────────────────────────────────

export const api = { entries, savings, upload, stocks, crypto };
