/**
 * Type definition for an async process function that takes parameters and returns a result
 * @template TParams The type of parameters the process accepts
 * @template TResult The type of result the process returns
 */
export type AsyncProcess<TParams, TResult> = (params: TParams) => Promise<TResult>;

/**
 * Handles the execution of asynchronous processes ensuring that:
 * - Only one process runs at a time
 * - The most recently requested parameters are always processed
 * - No concurrent executions occur
 * - The last requested parameters are processed after the current execution completes
 *
 * @template TParams The type of parameters the process accepts
 * @template TResult The type of result the process returns
 *
 * @example
 * ```typescript
 * // Simple number parameter example
 * const blurHandler = new AsyncProcessHandler<number, void>(
 *     async (radius) => {
 *         await applyBlur(radius);
 *     }
 * );
 *
 * // Complex parameter example
 * interface ProcessParams {
 *     radius: number;
 *     intensity: number;
 * }
 *
 * const processor = new AsyncProcessHandler<ProcessParams, void>(
 *     async (params) => {
 *         await process(params);
 *     }
 * );
 * ```
 */
export class AsyncProcessHandler<TParams, TResult> {
  private pendingParams: TParams | null = null;
  private isProcessing = false;

  constructor(
    private readonly process: AsyncProcess<TParams, TResult>,
    private readonly onResult?: (result: TResult) => void,
    private readonly onError?: (error: unknown) => void
  ) {
  }

  /**
   * Request execution of the async process with new parameters
   * If a process is already running, these parameters will be used
   * for the next execution after the current one completes
   */
  public async request(params: TParams): Promise<void> {
    this.pendingParams = params;

    // If already processing, wait for that to complete
    if (this.isProcessing) {
      return;
    }

    // Process until no more pending parameters
    while (this.pendingParams !== null) {
      await this.processNext();
    }
  }

  private async processNext(): Promise<void> {
    if (this.pendingParams === null) {
      return;
    }

    try {
      this.isProcessing = true;
      const paramsToProcess = this.pendingParams;
      this.pendingParams = null;

      const result = await this.process(paramsToProcess);
      this.onResult?.(result);
    } catch (error) {
      this.onError?.(error);
      throw error; // Re-throw to allow caller to handle if needed
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Check if there's a process currently running
   */
  public isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Check if there are any pending parameters waiting to be processed
   */
  public hasPending(): boolean {
    return this.pendingParams !== null;
  }
}


