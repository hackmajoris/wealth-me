export interface Entry {
  id: number;
  month: string;
  monthFull: string;
  yr: number;
  mo: string;
  cryptoInvested: number;
  cryptoReturn: number;
  stocksInvested: number;
  stocksReturn: number;
  note: string;
  createdAt: string;
}

export interface SavingsEntry {
  id: number;
  month: string;
  monthFull: string;
  yr: number;
  mo: string;
  netIncome: number;
  totalExpenses: number;
  savings: number;
  savingRate: number;
  target: number;
  note: string;
  updatedAt: string;
}

export function loadEntries(): Entry[] {
  try { return JSON.parse(localStorage.getItem('wm_entries') ?? '[]') as Entry[]; }
  catch { return []; }
}

export function saveEntries(entries: Entry[]): void {
  localStorage.setItem('wm_entries', JSON.stringify(entries));
}

export function loadSavingsEntries(): SavingsEntry[] {
  try { return JSON.parse(localStorage.getItem('wm_savings') ?? '[]') as SavingsEntry[]; }
  catch { return []; }
}

export function saveSavingsEntries(entries: SavingsEntry[]): void {
  localStorage.setItem('wm_savings', JSON.stringify(entries));
}
