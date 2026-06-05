/**
 * Simple polynomial regression calculator
 * Fits data to a polynomial of given degree
 */

interface Matrix {
  data: number[][];
  rows: number;
  cols: number;
}

function createMatrix(rows: number, cols: number): Matrix {
  return {
    data: Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0)),
    rows,
    cols,
  };
}

function matrixMultiply(a: Matrix, b: Matrix): Matrix {
  const result = createMatrix(a.rows, b.cols);
  for (let i = 0; i < a.rows; i++) {
    for (let j = 0; j < b.cols; j++) {
      let sum = 0;
      for (let k = 0; k < a.cols; k++) {
        sum += a.data[i][k] * b.data[k][j];
      }
      result.data[i][j] = sum;
    }
  }
  return result;
}

function matrixInverse(m: Matrix): Matrix {
  const n = m.rows;
  const aug = createMatrix(n, 2 * n);

  // Create augmented matrix [A | I]
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      aug.data[i][j] = m.data[i][j];
    }
    aug.data[i][n + i] = 1;
  }

  // Gauss-Jordan elimination
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug.data[k][i]) > Math.abs(aug.data[maxRow][i])) {
        maxRow = k;
      }
    }

    [aug.data[i], aug.data[maxRow]] = [aug.data[maxRow], aug.data[i]];

    const pivot = aug.data[i][i];
    for (let j = 0; j < 2 * n; j++) {
      aug.data[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = aug.data[k][i];
        for (let j = 0; j < 2 * n; j++) {
          aug.data[k][j] -= factor * aug.data[i][j];
        }
      }
    }
  }

  const inv = createMatrix(n, n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      inv.data[i][j] = aug.data[i][n + j];
    }
  }
  return inv;
}

/**
 * Fit polynomial to data points
 * Returns coefficients [a0, a1, a2, ...] for polynomial a0 + a1*x + a2*x^2 + ...
 */
export function polyfit(xData: number[], yData: number[], degree: number): number[] {
  const n = xData.length;

  // Build Vandermonde matrix
  const A = createMatrix(n, degree + 1);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= degree; j++) {
      A.data[i][j] = Math.pow(xData[i], j);
    }
  }

  // Build y vector as matrix
  const y = createMatrix(n, 1);
  for (let i = 0; i < n; i++) {
    y.data[i][0] = yData[i];
  }

  // Solve: (A^T * A) * coeff = A^T * y
  const At = createMatrix(degree + 1, n);
  for (let i = 0; i <= degree; i++) {
    for (let j = 0; j < n; j++) {
      At.data[i][j] = A.data[j][i];
    }
  }

  const AtA = matrixMultiply(At, A);
  const Aty = matrixMultiply(At, y);

  const AtAinv = matrixInverse(AtA);
  const coeff = matrixMultiply(AtAinv, Aty);

  return coeff.data.map((row) => row[0]);
}

/**
 * Evaluate polynomial at given x value
 */
export function evalPoly(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * Math.pow(x, i);
  }
  return result;
}

/**
 * Generate trend line points
 */
export function generateTrendLine(xData: number[], yData: number[], degree: number): number[] {
  const coeffs = polyfit(xData, yData, degree);
  return xData.map((_, i) => evalPoly(coeffs, i));
}
