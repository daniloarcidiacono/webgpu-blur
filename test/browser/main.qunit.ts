import { test, module } from "qunit";
import "@test/browser/filter/gauss_blur_2d.qunit.ts";
import "@test/browser/webgpu/read_texture.qunit.ts";
import "@test/browser/utils/texture_assert.ts";
import '@test/browser/qunit.css';

module("WebGPU", hooks => {
  test("is available", async (assert) => {
    assert.ok(navigator.gpu, "WebGPU is supported");

    const adapter = await navigator.gpu.requestAdapter();
    assert.ok(adapter, "Able to request GPU adapter");

    assert.ok(true, `Vendor: ${adapter!.info.vendor}`);
    assert.ok(true, `Device: ${adapter!.info.device}`);
    assert.ok(true, `Description: ${adapter!.info.description}`);
    assert.ok(true, `Architecture: ${adapter!.info.architecture}`);
  });
});
