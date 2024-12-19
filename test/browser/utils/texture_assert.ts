import { TypedArray } from "@/webgpu/texture_metadata.ts";
import { formatMatrix } from "@/utils/math.ts";

/**
 * Asserts that the texture data matches the expected data, comparing pixel values
 * based on the texture's width, height, and number of channels.
 *
 * @param actual - The actual texture data (as a TypedArray, e.g., Uint8Array).
 * @param expected - The expected texture data (as a TypedArray).
 * @param width - The width of the texture.
 * @param height - The height of the texture.
 * @param channelCount - The number of channels in the texture (default is 1, e.g., grayscale)
 * @param tolerance - Maximum error (default is 0, e.g., no error)
 * @param message - An optional message to display if the assertion fails.
 *
 * @example
 * assert.textureMatches(actualTextureData, expectedTextureData, 512, 512, 3, 1e-3, "Textures do not match");
 *
 * @throws {Error} Throws an error if the actual texture data does not match the expected data.
 */
QUnit.assert.textureMatches = function(
  actual: TypedArray,
  expected: TypedArray,
  width: number,
  height: number,
  channelCount: number = 1,
  tolerance: number = 0,
  message?: string
) {
  // Verify the result length matches the expected size
  const expectedSize = width * height * channelCount;
  const lengthMatches = actual.length === expectedSize;
  let mismatchIndex = -1;
  if (lengthMatches) {
    mismatchIndex = actual.findIndex((value, index) => Math.abs(value - expected[index]) > tolerance);
  }

  const textureMatches = lengthMatches && mismatchIndex === -1;

  let actualMsg: string, expectedMsg: string;
  if (width * height <= 100) {
    actualMsg = formatMatrix(actual, channelCount, width, height, '\t');
    expectedMsg = formatMatrix(expected, channelCount, width, height, '\t');
  } else if (mismatchIndex !== -1) {
    actualMsg = `length: ${actual.length}, actual[${mismatchIndex}] = ${actual[mismatchIndex]}`;
    expectedMsg = `length: ${expected.length}, expected[${mismatchIndex}] = ${expected[mismatchIndex]}`;
  } else {
    actualMsg = `length: ${actual.length}`;
    expectedMsg = `length: ${expected.length}`;
  }

  this.pushResult({
    result: textureMatches,
    actual: actualMsg,
    expected: expectedMsg,
    message: message || `Texture data matches`
  });
}
