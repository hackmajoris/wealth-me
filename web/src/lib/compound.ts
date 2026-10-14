/**
 * Future value of a starting amount plus a fixed contribution added at the end
 * of every year: PV×(1+i)^n + PMT×((1+i)^n − 1) ÷ i.
 */
export function futureValue(pv: number, pmt: number, rate: number, years: number): number {
  const growth = Math.pow(1 + rate, years);
  const contributions = rate === 0 ? pmt * years : (pmt * (growth - 1)) / rate;
  return pv * growth + contributions;
}
