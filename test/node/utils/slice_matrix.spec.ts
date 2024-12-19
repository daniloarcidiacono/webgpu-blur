import { sliceMatrix } from "@/utils/slice_matrix.ts";

describe('sliceMatrix', () => {
  // Successful cases
  describe('successful matrix slicing', () => {
    it('should remove padding from the end of each row', () => {
      // Create a matrix with 10 rows of 256-byte rows, wanting 100-byte rows
      const originalMatrix = new ArrayBuffer(256 * 10);
      const sourceView = new Uint8Array(originalMatrix);

      // Fill the source view with a predictable pattern
      sourceView.forEach((_, i) => {
        sourceView[i] = i % 256;
      });

      const result = sliceMatrix(originalMatrix, 256, 100);
      expect(result.byteLength).toBe(100 * 10);

      // Verify the first 100 bytes match the original first 100 bytes
      const resultView = new Uint8Array(result);
      for (let i = 0; i < 100; i++) {
        expect(resultView[i]).toBe(i);
      }
    });

    it('should work with exact row sizes', () => {
      const originalMatrix = new ArrayBuffer(100 * 5);
      const result = sliceMatrix(originalMatrix, 100, 100);

      expect(result.byteLength).toBe(100 * 5);
    });

    it('should handle minimal matrix with minimal slicing', () => {
      const matrix = new ArrayBuffer(10);
      const result = sliceMatrix(matrix, 10, 5);

      expect(result.byteLength).toBe(5);
    });
  });

  // Error cases
  describe('error handling', () => {
    it('should throw error for empty matrix', () => {
      const emptyMatrix = new ArrayBuffer(0);

      expect(() => {
        sliceMatrix(emptyMatrix, 256, 100);
      }).toThrow('Input matrix is empty');
    });

    it('should throw error for non-positive bytes per row', () => {
      const matrix = new ArrayBuffer(256 * 10);

      expect(() => {
        sliceMatrix(matrix, 0, 100);
      }).toThrow('Bytes per row must be positive');

      expect(() => {
        sliceMatrix(matrix, -10, 100);
      }).toThrow('Bytes per row must be positive');
    });

    it('should throw error when matrix size is not evenly divisible by bytes per row', () => {
      const matrix = new ArrayBuffer(257); // Not evenly divisible by 256

      expect(() => {
        sliceMatrix(matrix, 256, 100);
      }).toThrow('Matrix size (257 bytes) is not evenly divisible by bytes per row (256 bytes)');
    });

    it('should throw error when target bytes per row is larger than source bytes per row', () => {
      const matrix = new ArrayBuffer(256 * 10);

      expect(() => {
        sliceMatrix(matrix, 256, 300);
      }).toThrow('Target bytes per row (300) cannot be larger than source bytes per row (256)');
    });
  });
});
