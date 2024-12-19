import { range } from "@/utils/range.ts";

describe('range', () => {
  // Basic functionality tests
  describe('basic range generation', () => {
    it('should generate range from 0 to n when single argument is provided', () => {
      expect(range(5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(0)).toEqual([]);
    });

    it('should generate range from start to end when two arguments are provided', () => {
      expect(range(1, 6)).toEqual([1, 2, 3, 4, 5]);
      expect(range(-3, 2)).toEqual([-3, -2, -1, 0, 1]);
    });

    it('should generate range with custom step when three arguments are provided', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]);
      expect(range(1, 10, 3)).toEqual([1, 4, 7]);
    });
  });

  // Descending range tests
  describe('descending ranges', () => {
    it('should generate descending range with negative step', () => {
      expect(range(5, 0, -1)).toEqual([5, 4, 3, 2, 1]);
      expect(range(10, 0, -2)).toEqual([10, 8, 6, 4, 2]);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('should return empty array when start equals end', () => {
      expect(range(5, 5)).toEqual([]);
      expect(range(0, 0)).toEqual([]);
    });

    it('should return empty array when step would never reach end', () => {
      expect(range(0, 10, -1)).toEqual([]);
      expect(range(10, 0, 1)).toEqual([]);
    });
  });

  // Error cases
  describe('error handling', () => {
    it('should throw error when step is zero', () => {
      expect(() => range(0, 10, 0)).toThrow('Step cannot be zero');
    });
  });

  // Floating point and large range tests
  describe('floating point and large ranges', () => {
    it('should work with floating point steps', () => {
      expect(range(0, 2, 0.5)).toEqual([0, 0.5, 1, 1.5]);
    });

    it('should handle large ranges', () => {
      const largeRange = range(0, 1000, 100);
      expect(largeRange.length).toBe(10);
      expect(largeRange[0]).toBe(0);
      expect(largeRange[9]).toBe(900);
    });
  });

  // Type checking (compile-time tests)
  describe('type checking', () => {
    it('should return number array', () => {
      const result = range(5);
      // This is a compile-time check
      const checkType: number[] = result;
      expect(Array.isArray(result)).toBe(true);
      expect(typeof result[0]).toBe('number');
    });
  });
});
