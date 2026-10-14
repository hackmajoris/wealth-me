// Early-retirement (FIRE) math, same model as networthify's calculator:
// the portfolio compounds at a fixed annual return while (income - expenses) is
// added every month; you can retire once it reaches expenses / withdrawal rate.

export interface RetirementInputs {
  annualIncome: number;
  annualExpenses: number;
  balance: number;
  annualReturnPct: number;
  withdrawalRatePct: number;
}

const MAX_MONTHS = 100 * 12;

/** Portfolio size that sustains the yearly expenses at the withdrawal rate. */
export function retirementTarget({ annualExpenses, withdrawalRatePct }: RetirementInputs): number {
  if (withdrawalRatePct <= 0) return Infinity;
  return Math.max(0, annualExpenses) / (withdrawalRatePct / 100);
}

/**
 * Years until the balance reaches the target, with month precision.
 * Returns null when it is not reached within 100 years.
 */
export function yearsToRetirement(inputs: RetirementInputs): number | null {
  const target = retirementTarget(inputs);
  let balance = inputs.balance;
  if (balance >= target) return 0;
  const monthlyReturn = Math.pow(1 + inputs.annualReturnPct / 100, 1 / 12) - 1;
  const monthlySavings = (inputs.annualIncome - inputs.annualExpenses) / 12;
  for (let m = 1; m <= MAX_MONTHS; m++) {
    balance = balance * (1 + monthlyReturn) + monthlySavings;
    if (balance >= target) return m / 12;
  }
  return null;
}

/** Portfolio balance at the start and after each full year, for `years` years. */
export function balancePath(inputs: RetirementInputs, years: number): number[] {
  const monthlyReturn = Math.pow(1 + inputs.annualReturnPct / 100, 1 / 12) - 1;
  const monthlySavings = (inputs.annualIncome - inputs.annualExpenses) / 12;
  const out = [inputs.balance];
  let balance = inputs.balance;
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + monthlyReturn) + monthlySavings;
    if (m % 12 === 0) out.push(balance);
  }
  return out;
}
