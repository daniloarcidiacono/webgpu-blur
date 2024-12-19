/**
 * Creates an array of integers within a specified range.
 *
 * @param start The start of the range (inclusive)
 * @param end The end of the range (exclusive)
 * @param step The increment between elements (default is 1)
 * @returns An array of integers in the specified range
 *
 * @example
 * // Returns [0, 1, 2, 3, 4]
 * range(5)
 *
 * @example
 * // Returns [1, 2, 3, 4, 5]
 * range(1, 6)
 *
 * @example
 * // Returns [0, 2, 4, 6, 8]
 * range(0, 10, 2)
 *
 * @example
 * // Returns [5, 4, 3, 2, 1]
 * range(5, 0, -1)
 */
export function range(start: number, end?: number, step = 1): number[] {
  // If only one argument is provided, treat it as the end value
  if (end === undefined) {
    end = start;
    start = 0;
  }

  // Validate step size
  if (step === 0) {
    throw new Error('Step cannot be zero');
  }

  const result: number[] = [];

  // Determine loop conditions based on step direction
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }

  return result;
}
