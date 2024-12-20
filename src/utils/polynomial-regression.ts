/**
 * MIT License
 *
 * Copyright (c) 2020 Daniel Herrero Hernando
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @see https://github.com/danielherrerohernando/polynomial-regression
 */
export type DataPoint = [number, number];
export type DataArray = DataPoint[];
export type Matrix = number[][];
export type AugmentedMatrix = number[][];
export type Coefficients = number[];
export type Params = Record<number, Coefficients>;

export class Model {
  private params: Params = {};

  fit(data: DataArray, degrees: number[]): void {
    degrees.forEach(degree => {
      const system = Model.buildSystem(data, degree);
      const coefficients = Model.solve(...system);
      this.params[degree] = coefficients;
    });
  }

  estimate(degree: number, x: number): number {
    return this.params[degree]?.reduce((acc, c, i) => acc + c * x ** i, 0);
  }

  loadParams(loadedData: Params): void {
    this.params = { ...this.params, ...loadedData };
  }

  saveParams(): Params {
    return this.params;
  }

  saveExpressions(): Record<number, string> {
    return Object.entries(this.params).reduce((acc, [degree, coefficients]) => {
      acc[parseInt(degree)] = Model.getExpression(coefficients);
      return acc;
    }, {} as Record<number, string>);
  }

  expressions(): Record<number, string> {
    return Object.entries(this.params).reduce((acc, [degree, coefficients]) => {
      acc[parseInt(degree)] = Model.getExpression(coefficients);
      return acc;
    }, {} as Record<number, string>);
  }

  private static buildArray(size: number): string[] {
    return new Array(size).fill('');
  }

  private static addOperator(s: string): string {
    return s[0] === '-' ? s : '+' + s;
  }

  private static getExpression(params: number[]): string {
    return params.reduce(
      (acc, el, i) => acc + this.addOperator(el.toString().replace('e', 'E')) + '*x^' + `${i}`,
      ''
    );
  }

  private static buildBase(degree: number): ((x: number) => number)[] {
    return this.buildArray(degree + 1).map((_, i) => (x: number) => x ** i);
  }

  private static buildGramMatrix(data: DataArray, base: ((x: number) => number)[]): Matrix {
    return this.buildArray(base.length).map((_, i) =>
      this.buildArray(base.length).map((_, j) =>
        data.reduce((acc, [x]) => acc + base[i](x) * base[j](x), 0)
      )
    );
  }

  private static buildIndependentTerm(data: DataArray, base: ((x: number) => number)[]): number[][] {
    return this.buildArray(base.length).map((_, i) => [
      data.reduce((acc, [x, y]) => acc + base[i](x) * y, 0),
    ]);
  }

  private static buildSystem(data: DataArray, degree: number): [Matrix, number[][]] {
    const base = this.buildBase(degree);
    const gramMatrix = this.buildGramMatrix(data, base);
    const independentTerm = this.buildIndependentTerm(data, base);
    return [gramMatrix, independentTerm];
  }

  private static buildAugmentedMatrix(leftMatrix: Matrix, rightMatrix: number[][]): AugmentedMatrix {
    return leftMatrix.map((row, i) => row.concat(rightMatrix[i]));
  }

  private static triangularize(augmentedMatrix: AugmentedMatrix): AugmentedMatrix {
    const n = augmentedMatrix.length;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const c = augmentedMatrix[j][i] / augmentedMatrix[i][i];
        for (let k = i + 1; k < n + 1; k++) {
          augmentedMatrix[j][k] -= c * augmentedMatrix[i][k];
        }
      }
    }
    return augmentedMatrix;
  }

  private static backSubstitute(augmentedMatrix: AugmentedMatrix): Coefficients {
    const x: number[] = [];
    const n = augmentedMatrix.length;
    for (let i = n - 1; i >= 0; i--) {
      const alreadySolvedTerms = x.reduce(
        (acc, val, idx) => acc + val * augmentedMatrix[i][n - 1 - idx],
        0
      );
      x.push((augmentedMatrix[i][n] - alreadySolvedTerms) / augmentedMatrix[i][i]);
    }
    return x.reverse();
  }

  private static solve(leftMatrix: Matrix, rightMatrix: number[][]): Coefficients {
    return this.backSubstitute(this.triangularize(this.buildAugmentedMatrix(leftMatrix, rightMatrix)));
  }
}
