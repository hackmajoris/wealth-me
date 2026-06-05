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
  try {
    return JSON.parse(localStorage.getItem('wm_entries') ?? '[]') as Entry[];
  } catch {
    return [];
  }
}

export function saveEntries(entries: Entry[]): void {
  localStorage.setItem('wm_entries', JSON.stringify(entries));
}

export interface Asset {
  id: number;
  name: string;
  category: string;
  value: number;
  purchasePrice: number;
  purchaseDate: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: number;
  name: string;
  category: string;
  balance: number;
  limit: number;
  interestRate: number;
  minimumPayment: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export function loadSavingsEntries(): SavingsEntry[] {
  try {
    return JSON.parse(localStorage.getItem('wm_savings') ?? '[]') as SavingsEntry[];
  } catch {
    return [];
  }
}

export function saveSavingsEntries(entries: SavingsEntry[]): void {
  localStorage.setItem('wm_savings', JSON.stringify(entries));
}
