/**
 * A utility class for measuring GPU operation execution times using WebGPU timestamp queries.
 * It provides mechanisms to measure the duration of GPU operations by capturing timestamps
 * at the beginning and end of render passes.
 *
 * @remarks
 * This class requires the 'timestamp-query' feature to be enabled on the GPU device.
 * The timestamps are measured in nanoseconds and are based on a monotonic clock.
 *
 * @example
 * ```typescript
 * const timer = new GPUTimer(device);
 *
 * // In your render loop:
 * const commandEncoder = device.createCommandEncoder();
 * const renderPass = commandEncoder.beginRenderPass({
 *   ...passDescriptor,
 *   ...timer.renderPass // Adds timestamp measurements
 * });
 *
 * // Your render commands here
 * renderPass.end();
 *
 * timer.resolveQuerySet(commandEncoder);
 * device.queue.submit([commandEncoder.finish()]);
 *
 * // Later, read the timing:
 * const duration = await timer.read();
 * console.log(`Operation took ${timer.fmtTime(duration)}`);
 * ```
 */
export class GPUTimer {
  private readonly querySet: GPUQuerySet;
  private readonly resolveBuffer: GPUBuffer;
  private readonly stagingBuffer: GPUBuffer;

  /**
   * Creates a new GPUTimer instance.
   *
   * @param device - The WebGPU device to use for creating query sets and buffers
   * @throws {Error} If the 'timestamp-query' feature is not supported by the device
   */
  constructor(device: GPUDevice) {
    this.querySet = device.createQuerySet({
      type: 'timestamp',
      count: 2
    });

    this.resolveBuffer = device.createBuffer({
      size: this.querySet.count * 8,
      usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC
    });

    this.stagingBuffer = device.createBuffer({
      size: this.resolveBuffer.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
  }

  /**
   * Resolves the query set timestamps into the staging buffer for reading.
   * Must be called after the render pass but before reading the timing results.
   *
   * @param encoder - The command encoder to use for resolving queries
   */
  resolveQuerySet(encoder: GPUCommandEncoder) {
    encoder.resolveQuerySet(this.querySet, 0, this.querySet.count, this.resolveBuffer, 0);
    encoder.copyBufferToBuffer(this.resolveBuffer, 0, this.stagingBuffer, 0, this.stagingBuffer.size);
  }

  /**
   * Formats a GPU timestamp difference into a human-readable string.
   *
   * @param gpuTime - The GPU time in nanoseconds
   * @returns A formatted string with the time in milliseconds (e.g., "1.234ms")
   */
  fmtTime(gpuTime: number): string {
    // µ
    return `${(gpuTime * 1e-6).toFixed(3)}ms`;
  }

  /**
   * Reads the timing results from the staging buffer.
   * Must be called after the command buffer has been submitted and executed.
   *
   * @returns A promise that resolves to the duration in nanoseconds between
   *          the beginning and end timestamps
   * @throws {Error} If the staging buffer cannot be mapped or read
   */
  async read(): Promise<number> {
    try {
      await this.stagingBuffer.mapAsync(GPUMapMode.READ);
      const times = new BigInt64Array(this.stagingBuffer.getMappedRange());
      return Number(times[1] - times[0]);
    } finally {
      this.stagingBuffer.unmap();
    }
  }

  /**
   * Gets the timestamp write configuration for a render pass.
   * Use this in your render pass descriptor to enable timing measurements.
   *
   * @returns An object containing the timestampWrites configuration
   *
   * @example
   * ```typescript
   * const renderPass = encoder.beginRenderPass({
   *   colorAttachments: [...],
   *   ...timer.renderPass
   * });
   * ```
   */
  get renderPass(): Pick<GPURenderPassDescriptor, 'timestampWrites'> {
    return {
      timestampWrites: {
        querySet: this.querySet,
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1
      }
    };
  }

  /**
   * Cleans up all GPU resources used by this timer.
   * Should be called when the timer is no longer needed.
   */
  destroy() {
    this.resolveBuffer.destroy();
    this.stagingBuffer.destroy();
    this.querySet.destroy();
  }
}
