import { Model } from "@/utils/polynomial-regression.ts";

describe('Model', () => {
  it('fits the model with provided data', () => {
    const model = new Model();
    model.fit([ [3, 4], [4, 5], [5, 2], [6, 8] ], [3]);
    expect(model.estimate(3, 4)).toBeCloseTo(5, 5);
  });
});
