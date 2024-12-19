import { TEXTURE_FORMAT_INFO, TypedArray } from '@/webgpu/texture_metadata.ts';

/**
 * Creates and initializes a GPU texture with the provided data.
 *
 * This utility function simplifies the creation of a WebGPU texture by configuring it with the specified format,
 * dimensions, and usage flags, and populating it with initial data.
 *
 * @param device - The `GPUDevice` instance used to create the texture.
 * @param format - The format of the texture, specified as a `GPUTextureFormat`.
 * @param width - The width of the texture in texels.
 * @param height - The height of the texture in texels.
 * @param data - A `TypedArray` containing the initial pixel data to upload to the texture.
 * @param usage - Additional usage flags for the texture, specified as `GPUBufferUsageFlags`.
 * @param label - An optional label for the texture to help with debugging and profiling.
 * @returns A `GPUTexture` initialized with the specified data and configuration.
 *
 * @throws {Error} If the provided format is not supported or the data layout is incompatible with the specified dimensions.
 *
 * @example
 * ```typescript
 * const device: GPUDevice = ...; // Obtain a WebGPU device
 * const format: GPUTextureFormat = "rgba8unorm";
 * const width = 256;
 * const height = 256;
 * const data = new Uint8Array(width * height * 4); // Example RGBA data
 * const usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
 * const label = "MyTexture";
 *
 * const texture = generateTexture(device, format, width, height, data, usage, label);
 * console.log(texture); // GPUTexture instance
 * ```
 */
export function generateTexture(
  device: GPUDevice,
  format: GPUTextureFormat,
  width: number,
  height: number,
  data: TypedArray,
  usage: GPUBufferUsageFlags,
  label: string
): GPUTexture {
  const { bytesPerTexel } = TEXTURE_FORMAT_INFO[format]!;
  const bytesPerRow = bytesPerTexel * width;
  const texture = device.createTexture({
    size: { width, height },
    format,
    usage: GPUTextureUsage.COPY_DST | usage,
    label
  });

  device.queue.writeTexture(
    { texture },
    data,
    {
      bytesPerRow,
      rowsPerImage: height
    },
    [width, height]
  );

  return texture;
}
