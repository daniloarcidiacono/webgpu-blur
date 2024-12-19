import { test, module } from "qunit";
import { generateTexture } from "@/webgpu/generate_texture.ts";
import { readTextureData } from "@/webgpu/read_texture.ts";
import { range } from "@/utils/range.ts";

module("Texture Read", hooks => {
  let adapter: GPUAdapter;
  let device: GPUDevice;

  hooks.before(async (assert) => {
    // Request the GPU adapter
    adapter = (await navigator.gpu.requestAdapter())!;
    assert.ok(adapter, "Able to request GPU adapter");

    // Request the GPU device
    device = await adapter.requestDevice({
      requiredFeatures: [
        "float32-filterable"
      ]
    });
    assert.ok(device, "Able to request GPU device");
  });

  test("works with non padded texture", async (assert) => {
    // 64 floats per row = 256 bytes per row
    return generateAndRead(assert, 64, 64);
  });

  test("works with padded texture", async (assert) => {
    // 32 floats per row = 128 bytes per row, which are padded to 256 bytes
    return generateAndRead(assert, 32, 32);
  });

  async function generateAndRead(assert: Assert, width: number, height: number) {
    let inputTexture: GPUTexture | undefined;
    try {
      // Generate a texture with input data
      const data = new Float32Array(range(width * height));
      inputTexture = generateTexture(
        device,
        "r32float",
        width, height,
        data,
        GPUTextureUsage.COPY_SRC,
        "inputTexture"
      );

      // Read back
      const textureData: Float32Array = await readTextureData(
        device,
        inputTexture
      ) as Float32Array;

      // Assert for equality
      assert.textureMatches(textureData, data, width, height, 1, 0, "data read from GPU should match");
    } finally {
      inputTexture?.destroy();
    }
  }
});
