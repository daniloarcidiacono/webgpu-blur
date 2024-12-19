/**
 * Slices a matrix represented as an `ArrayBuffer` into rows of a specified size.
 *
 * This function takes a matrix stored as a flat `ArrayBuffer`, interprets it as having rows of a given byte size (`bytesPerRow`),
 * and creates a new `ArrayBuffer` where each row is truncated or sliced to a specified target byte size (`targetBytesPerRow`).
 *
 * @param matrix - The input matrix represented as an `ArrayBuffer`.
 * @param bytesPerRow - The number of bytes in each row of the source matrix.
 * @param targetBytesPerRow - The number of bytes to retain in each row of the resulting matrix.
 * @returns A new `ArrayBuffer` containing the sliced matrix with rows of the specified target size.
 *
 * @throws {Error} If the input matrix is empty.
 * @throws {Error} If `bytesPerRow` or `targetBytesPerRow` is not positive.
 * @throws {Error} If the matrix size is not evenly divisible by `bytesPerRow`.
 * @throws {Error} If `targetBytesPerRow` is larger than `bytesPerRow`.
 *
 * @example
 * ```typescript
 * const matrix = new ArrayBuffer(16); // 16 bytes
 * const bytesPerRow = 8; // Each row has 8 bytes
 * const targetBytesPerRow = 4; // Retain 4 bytes per row
 *
 * const slicedMatrix = sliceMatrix(matrix, bytesPerRow, targetBytesPerRow);
 * console.log(slicedMatrix.byteLength); // Outputs 8 (2 rows * 4 bytes per row)
 * ```
 */
export function sliceMatrix(
  matrix: ArrayBuffer,
  bytesPerRow: number,
  targetBytesPerRow: number
): ArrayBuffer {
  // Sanity checks
  if (matrix.byteLength === 0) {
    throw new Error('Input matrix is empty');
  }

  if (bytesPerRow <= 0 || targetBytesPerRow <= 0) {
    throw new Error('Bytes per row must be positive');
  }

  // Ensure matrix size is evenly divisible by bytes per row
  if (matrix.byteLength % bytesPerRow !== 0) {
    throw new Error(
      `Matrix size (${matrix.byteLength} bytes) is not evenly divisible by bytes per row (${bytesPerRow} bytes)`
    );
  }

  // Ensure target bytes per row is not larger than source bytes per row
  if (targetBytesPerRow > bytesPerRow) {
    throw new Error(
      `Target bytes per row (${targetBytesPerRow}) cannot be larger than source bytes per row (${bytesPerRow})`
    );
  }

  // Calculate height based on total buffer size and current bytes per row
  const height = matrix.byteLength / bytesPerRow;

  // Create a new buffer with the target bytes per row
  const slicedMatrix = new ArrayBuffer(height * targetBytesPerRow);

  // Create views for the source and destination buffers
  const sourceView = new Uint8Array(matrix);
  const destinationView = new Uint8Array(slicedMatrix);

  // Iterate through rows and copy the relevant portion
  for (let row = 0; row < height; row++) {
    // Source row start and slice
    const sourceRowStart = row * bytesPerRow;
    const sourceRowSlice = sourceView.subarray(
      sourceRowStart,
      sourceRowStart + targetBytesPerRow
    );

    // Destination row start
    const destRowStart = row * targetBytesPerRow;

    // Copy the slice to the destination
    destinationView.set(sourceRowSlice, destRowStart);
  }

  return slicedMatrix;
}
