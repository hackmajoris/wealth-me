/** Fits a degree-`degree` polynomial to `data` and returns predicted values for each index. */
export function polyTrend(data: number[], degree = 2): number[] {
  const n = data.length;
  if (n <= degree) return [...data];

  const d = degree + 1;

  // Build normal-equations matrix A (d×d) and rhs vector
  const A: number[][] = Array.from({ length: d }, (_, i) =>
    Array.from({ length: d }, (_, j) => {
      let s = 0;
      for (let x = 0; x < n; x++) s += Math.pow(x, i + j);
      return s;
    })
  );
  const rhs: number[] = Array.from({ length: d }, (_, i) => {
    let s = 0;
    for (let x = 0; x < n; x++) s += data[x] * Math.pow(x, i);
    return s;
  });

  // Gaussian elimination with partial pivoting on augmented matrix [A | rhs]
  const M = A.map((row, i) => [...row, rhs[i]]);
  for (let col = 0; col < d; col++) {
    let maxRow = col;
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];
    for (let row = col + 1; row < d; row++) {
      const f = M[row][col] / M[col][col];
      for (let k = col; k <= d; k++) M[row][k] -= f * M[col][k];
    }
  }

  // Back substitution → coefficients [c0, c1, c2, ...] for c0 + c1*x + c2*x^2 + …
  const coeffs = new Array(d).fill(0);
  for (let i = d - 1; i >= 0; i--) {
    coeffs[i] = M[i][d];
    for (let j = i + 1; j < d; j++) coeffs[i] -= M[i][j] * coeffs[j];
    coeffs[i] /= M[i][i];
  }

  return Array.from({ length: n }, (_, x) => {
    let y = 0;
    for (let p = 0; p < d; p++) y += coeffs[p] * Math.pow(x, p);
    return Math.round(Math.max(0, y));
  });
}

export function calcAverage(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}
