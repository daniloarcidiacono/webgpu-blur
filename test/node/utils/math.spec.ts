import { pad } from "@/utils/math.ts";

describe('pad function', () => {
  it('should return the same number when it is already a multiple', () => {
    expect(pad(10, 5)).toBe(10);
    expect(pad(15, 5)).toBe(15);
  });

  it('should round up to the next multiple', () => {
    expect(pad(11, 5)).toBe(15);
    expect(pad(12, 5)).toBe(15);
    expect(pad(13, 5)).toBe(15);
    expect(pad(14, 5)).toBe(15);
  });

  it('should handle zero values correctly', () => {
    expect(pad(0, 5)).toBe(0);
    // expect(pad(5, 0)).toBe(Infinity);
  });

  it('should work with negative numbers', () => {
    expect(pad(-7, 5)).toBe(-5);
    // expect(pad(-3, 5)).toBe(0);
  });

  it('should work with fractional numbers', () => {
    expect(pad(2.3, 5)).toBe(5);
    expect(pad(4.7, 5)).toBe(5);
  });

  it('should work with large numbers', () => {
    expect(pad(1000000, 1000)).toBe(1000000);
    expect(pad(1000001, 1000)).toBe(1001000);
  });

  it('should handle different divisors', () => {
    expect(pad(10, 3)).toBe(12);
    expect(pad(10, 7)).toBe(14);
  });

  it('should return the same value if divisor is 1', () => {
    expect(pad(42, 1)).toBe(42);
  });
});
