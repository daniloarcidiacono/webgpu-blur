import { module, skip, test } from "qunit";
import { generateTexture } from "@/webgpu/generate_texture.ts";
import { readTextureData } from "@/webgpu/read_texture.ts";
import { gauss2dBlur } from "@/filter/gauss_blur_2d.ts";
import { gauss2dBlurOptimized } from "@/filter/gauss_blur_2d_optimized.ts";
import { GPUTimer } from "@/webgpu/timer.ts";
import { TypedArray } from "@/webgpu/texture_metadata.ts";

module("Gaussian Blur 2D", hooks => {
  let adapter: GPUAdapter;
  let device: GPUDevice;

  hooks.before(async (assert) => {
    // Request the GPU adapter
    adapter = (await navigator.gpu.requestAdapter())!;
    assert.ok(adapter, "Able to request GPU adapter");

    // Request the GPU device
    device = await adapter.requestDevice({
      requiredFeatures: [
        "timestamp-query",
        "texture-compression-bc",
        "float32-filterable"
      ]
    });
    assert.ok(device, "Able to request GPU device");
  });

  test("point spread", async (assert) => {
    const inputData = new Uint8Array([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 255, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ]);

    const expectedData = new Uint8Array([
      0, 0, 0, 0, 0,
      0, 0, 2, 0, 0,
      0, 2, 244, 2, 0,
      0, 0, 2, 0, 0,
      0, 0, 0, 0, 0,
    ]);

    const expectedData2 = new Uint8Array([
      0, 0, 1, 0, 0,
      0, 9, 29, 9, 0,
      1, 29, 91, 29, 1,
      0, 9, 29, 9, 0,
      0, 0, 1, 0, 0,
    ]);

    await basicBlur(assert, "r8uint", inputData, expectedData, 1, 1);
    await basicBlur(assert, "r8uint", inputData, expectedData2, 2, 1);
  });

  test("point spread float", async (assert) => {
    const inputData = new Float32Array([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ]);

    const v0 = 0.00011810348951257765;
    const v1 = 0.010631335899233818;
    const v2 = 0.9570022225379944;
    const expectedData = new Float32Array([
      0,	0,	0,	0,	0,
      0,	v0,	v1,	v0,	0,
      0,	v1,	v2,	v1,	0,
      0,	v0,	v1,	v0,	0,
      0,	0,	0,	0,	0
    ]);

    await basicBlur(assert, "r32float", inputData, expectedData, 1, 1e-7);
  });

  test("horizontal edge", async (assert) => {
    const inputData = new Uint8Array([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      255, 255, 255, 255, 255,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ]);

    const expectedData = new Uint8Array([
      0, 0, 0, 0, 0,
      2, 2, 2, 2, 2,
      246, 249, 249, 249, 246,
      2, 2, 2, 2, 2,
      0, 0, 0, 0, 0,
    ]);

    await basicBlur(assert, "r8uint", inputData, expectedData, 1, 1);
  });

  test("checkerboard pattern", async (assert) => {
    const inputData = new Uint8Array([
      255, 0, 255, 0, 255,
      0, 255, 0, 255, 0,
      255, 0, 255, 0, 255,
      0, 255, 0, 255, 0,
      255, 0, 255, 0, 255,
    ]);

    const expectedData = new Uint8Array([
      244, 8, 244, 8, 244,
      8, 244, 10, 244, 8,
      244, 10, 244, 10, 244,
      8, 244, 10, 244, 8,
      244, 8, 244, 8, 244,
    ]);

    await basicBlur(assert, "r8uint", inputData, expectedData, 1, 1);
  });

  test("gradient", async (assert) => {
    const inputData = new Uint8Array([
      0, 50, 100, 150, 200,
      0, 50, 100, 150, 200,
      0, 50, 100, 150, 200,
      0, 50, 100, 150, 200,
      0, 50, 100, 150, 200
    ]);

    const expectedData = new Uint8Array([
      0, 49, 98, 148, 195,
      0, 50, 100, 150, 197,
      0, 50, 100, 150, 197,
      0, 50, 100, 150, 197,
      0, 49, 98, 148, 195
    ]);

    await basicBlur(assert, "r8uint", inputData, expectedData, 1, 1);
  });

  test("performance", async (assert) => {
    const w = device.limits.maxTextureDimension2D;
    const h = w;
    const inputData = new Uint8Array(w * h);
    const kernelRadius = 10;

    let inputTexture: GPUTexture | undefined;
    let blurredTexture: GPUTexture | undefined;
    let optimizedBlurredTexture: GPUTexture | undefined;
    let timer: GPUTimer | undefined;
    let timerOptimized: GPUTimer | undefined;
    try {
      timer = new GPUTimer(device);
      timerOptimized = new GPUTimer(device);

      inputTexture = generateTexture(
        device,
        "r8uint",
        w, h,
        inputData,
        GPUTextureUsage.TEXTURE_BINDING,
        "inputTexture"
      );

      blurredTexture = await gauss2dBlur(
        device,
        inputTexture,
        kernelRadius,
        undefined,
        timer
      );

      optimizedBlurredTexture = await gauss2dBlurOptimized(
        device,
        inputTexture,
        kernelRadius,
        undefined,
        timerOptimized
      );

      assert.ok(true, `${w}x${h} ${inputTexture.format} texture`);
      assert.ok(true, `Standard ${timer.fmtTime(await timer.read())}`);
      assert.ok(true, `Optimized ${timerOptimized.fmtTime(await timerOptimized.read())}`);
    } finally {
      timer?.destroy();
      timerOptimized?.destroy();
      inputTexture?.destroy();
      blurredTexture?.destroy();
      optimizedBlurredTexture?.destroy();
    }
  });

  async function basicBlur(
    assert: Assert,
    format: GPUTextureFormat,
    inputData: TypedArray,
    expectedData: TypedArray,
    kernelRadius: number,
    tolerance: number
  ) {
    let inputTexture: GPUTexture | undefined;
    let blurredTexture: GPUTexture | undefined;
    let optimizedBlurredTexture: GPUTexture | undefined;
    try {
      inputTexture = generateTexture(
        device,
        format,
        5, 5,
        inputData,
        GPUTextureUsage.TEXTURE_BINDING,
        "inputTexture"
      );

      blurredTexture = await gauss2dBlur(
        device,
        inputTexture,
        kernelRadius
      );

      optimizedBlurredTexture = await gauss2dBlurOptimized(
        device,
        inputTexture,
        kernelRadius
      );

      const blurredTextureData = await readTextureData(
        device,
        blurredTexture
      );

      const optimizedBlurredTextureData = await readTextureData(
        device,
        optimizedBlurredTexture
      );

      assert.textureMatches(
        blurredTextureData,
        expectedData,
        5, 5,
        1,
        tolerance,
        `gauss2dBlur works (k = ${kernelRadius})`
      );

      assert.textureMatches(
        optimizedBlurredTextureData,
        expectedData,
        5, 5,
        1,
        tolerance,
        `gauss2dBlurOptimized works (k = ${kernelRadius})`
      );

      // assert.deepEqual(
      //   blurredTextureData,
      //   expectedData,
      //   `gauss2dBlur works (k = ${kernelRadius})`
      // );
      //
      // assert.deepEqual(
      //   optimizedBlurredTextureData,
      //   expectedData,
      //   `gauss2dBlurOptimized works (k = ${kernelRadius})`
      // );
    } finally {
      inputTexture?.destroy();
      blurredTexture?.destroy();
      optimizedBlurredTexture?.destroy();
    }
  }
});
