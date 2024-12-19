import { TypedArray } from "@/webgpu/texture_metadata.ts";

/**
 * Returns the smallest multiple of the given number `m` that is greater than or equal to `v`.
 *
 * @param v - The base value to be padded to the next multiple of `m`.
 * @param m - The multiple to which `v` should be rounded up.
 * @returns The smallest multiple of `m` greater than or equal to `v`.
 *
 * @example
 * ```typescript
 * pad(7, 3); // Returns 9, since 9 is the smallest multiple of 3 >= 7
 * pad(12, 5); // Returns 15, since 15 is the smallest multiple of 5 >= 12
 * ```
 */
export function pad(v: number, m: number) {
  return Math.ceil(v / m) * m;
}

/**
 * Formats a flat TypedArray into a human-readable matrix string representation, where each row is on a new line
 * and values are separated by the specified separator.
 *
 * @param array - The input TypedArray containing the matrix data in row-major order
 * @param channelCount - Number of channels per element (e.g., 1 for grayscale, 3 for RGB)
 * @param rows - Number of rows in the matrix
 * @param cols - Number of columns in the matrix
 * @param separator - Optional string to use as separator between values (defaults to ', ')
 * @returns A formatted string representing the matrix, with values separated by the specified separator
 *          and rows separated by newlines
 * @throws {Error} If the array length doesn't match the specified dimensions (rows × cols × channelCount)
 *
 * @example
 * ```typescript
 * // For a 2x2 single-channel matrix
 * const data = new Float32Array([1, 2, 3, 4]);
 * const result = formatMatrix(data, 1, 2, 2);
 * // Result:
 * // 1, 2
 * // 3, 4
 *
 * // For a 2x2 RGB matrix (3 channels)
 * const rgbData = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
 * const rgbResult = formatMatrix(rgbData, 3, 2, 2);
 * // Result:
 * // 255, 0, 0, 0, 255, 0
 * // 0, 0, 255, 255, 255, 255
 * ```
 */
export function formatMatrix(array: TypedArray, channelCount: number, rows: number, cols: number, separator = ', '): string {
  if (array.length !== channelCount * rows * cols) {
    throw new Error(`Array length (${array.length}) does not match matrix dimensions (${rows}x${cols}).`);
  }

  let output = '';
  for (let i = 0; i < rows; i++) {
    output += array.slice(i * cols * channelCount, (i + 1) * cols * channelCount).join(separator) + separator + '\n';
  }

  return output.trim();  // Removes the trailing newline
}
