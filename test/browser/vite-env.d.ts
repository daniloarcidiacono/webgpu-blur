/// <reference types="vite/client" />
/// <reference types="qunit" />

declare global {
  // Augmenting the QUnit.assert interface to include the new textureMatches method
  interface Assert {
    textureMatches(
      actual: TypedArray,
      expected: TypedArray,
      width: number,
      height: number,
      channelCount: number,
      tolerance: number,
      message?: string
    ): void;
  }
}

export {};
