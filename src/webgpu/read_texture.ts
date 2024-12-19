import { TEXTURE_FORMAT_INFO, TypedArray } from "@/webgpu/texture_metadata.ts";
import { sliceMatrix } from "@/utils/slice_matrix.ts";
import { pad } from "@/utils/math.ts";

/**
 * Reads pixel data from a `GPUTexture` and returns it as a `TypedArray`.
 *
 * This function copies the contents of a `GPUTexture` into a buffer and retrieves the pixel data for further processing. It is useful for debugging or extracting texture data for non-GPU computations.
 *
 * @param device - The `GPUDevice` instance used to perform the read operation.
 * @param texture - The `GPUTexture` from which data will be read.
 * @returns A promise that resolves to a `TypedArray` containing the pixel data from the texture.
 *
 * @throws {Error} If the operation fails due to an incompatible texture format or configuration.
 *
 * @example
 * ```typescript
 * const device: GPUDevice = ...; // Obtain a WebGPU device
 * const texture: GPUTexture = ...; // A GPUTexture instance
 *
 * const pixelData = await readTextureData(device, texture);
 * console.log(pixelData); // Example output: Uint8Array containing pixel data
 * ```
 */
export async function readTextureData(
  device: GPUDevice,
  texture: GPUTexture
): Promise<TypedArray> {
  let stagingBuffer: GPUBuffer | undefined = undefined;
  try {
    const formatInfo = TEXTURE_FORMAT_INFO[texture.format]!;
    const bytesPerTexel = formatInfo.bytesPerTexel;
    const bytesPerRow = pad(bytesPerTexel * texture.width, 256);

    // 1) Crea un buffer di staging, configurato per essere mappabile sulla CPU
    stagingBuffer = device.createBuffer({
      label: `stagingBuffer(${texture.format})`,
      size: bytesPerRow * texture.height,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // 2) Copia il contenuto della texture nel buffer di staging utilizzando il metodo copyTextureToBuffer()
    const encoder: GPUCommandEncoder = device.createCommandEncoder(
      {
        label: `readTextureData(${texture.format})`
      }
    );
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: stagingBuffer, bytesPerRow },
      { width: texture.width, height: texture.height, depthOrArrayLayers: 1 }
    );
    const commandBuffer = encoder.finish();
    device.queue.submit([commandBuffer]);

    // 3) Mappa il buffer di staging nella RAM
    await stagingBuffer.mapAsync(GPUMapMode.READ);
    const mappedRange: ArrayBuffer = stagingBuffer.getMappedRange();

    // Rimuove il padding se necessario
    if (bytesPerRow !== bytesPerTexel * texture.width) {
      return new formatInfo.typedArrayConstructor(
        sliceMatrix(
          mappedRange,
          bytesPerRow,
          bytesPerTexel * texture.width
        )
      );
    }

    return new formatInfo.typedArrayConstructor(mappedRange.slice(0));
  } finally {
    if (stagingBuffer) {
      // 5) Annullare la mappatura del buffer
      stagingBuffer.unmap();

      // 6) Distruggere il buffer di staging per rilasciare la memoria GPU
      stagingBuffer.destroy();
    }
  }
}
