import { Gauss2dBlurOptimized } from "@/filter/gauss_blur_2d_optimized.ts";
import defaultImage from '../public/cat.png?url'
import { generateTexture } from "@/webgpu/generate_texture.ts";
import { GPUTimer } from "@/webgpu/timer.ts";
import { AsyncProcessHandler } from "@/async_process_handler.ts";
import { Gauss2dBlur } from "@/filter/gauss_blur_2d.ts";
import { Chart } from "chart.js/auto";
import { Model } from "@/utils/polynomial-regression.ts";

interface BenchmarkResults {
  size: { width: number, height: number };
  data: { x: number, y: number }[];
  optData: { x: number, y: number }[];
}

class WebGPUImageBlur {
  private device: GPUDevice | null = null;
  private originalCtx: CanvasRenderingContext2D | null = null;
  private blurredCtx: GPUCanvasContext | null = null;
  private inputTexture: GPUTexture | null = null;
  private gaussBlur: Gauss2dBlurOptimized | null = null;
  private blurTimer: GPUTimer | null = null;
  private blurProcessHandler: AsyncProcessHandler<number, void>;
  private chart: Chart | null = null;

  // UI
  private originalCanvas: HTMLCanvasElement;
  private blurredCanvas: HTMLCanvasElement;
  private benchmarkCanvas: HTMLCanvasElement;
  private originalCanvasTitle: HTMLHeadingElement;
  private blurredCanvasTitle: HTMLHeadingElement;
  private kernelRadiusSlider: HTMLInputElement;
  private kernelRadiusValue: HTMLOutputElement;
  private imageLoader: HTMLInputElement;
  private defaultImageBtn: HTMLButtonElement;
  private benchmarkBtn: HTMLButtonElement;

  constructor() {
    // Get DOM elements
    this.originalCanvas = document.getElementById('originalCanvas') as HTMLCanvasElement;
    this.blurredCanvas = document.getElementById('blurredCanvas') as HTMLCanvasElement;
    this.benchmarkCanvas = document.getElementById('benchmarkCanvas') as HTMLCanvasElement;
    this.originalCanvasTitle = document.getElementById('originalCanvasTitle') as HTMLHeadingElement;
    this.blurredCanvasTitle = document.getElementById('blurredCanvasTitle') as HTMLHeadingElement;
    this.kernelRadiusSlider = document.getElementById('kernelRadiusSlider') as HTMLInputElement;
    this.kernelRadiusValue = document.getElementById('kernelRadiusValue') as HTMLOutputElement;
    this.imageLoader = document.getElementById('imageLoader') as HTMLInputElement;
    this.defaultImageBtn = document.getElementById('defaultImageBtn') as HTMLButtonElement;
    this.benchmarkBtn = document.getElementById('benchmarkBtn') as HTMLButtonElement;

    // Setup event listeners
    this.kernelRadiusSlider.addEventListener('input', this.updateKernelRadius.bind(this));
    this.imageLoader.addEventListener('change', this.loadImageFromFile.bind(this));
    this.defaultImageBtn.addEventListener('click', this.loadDefaultImage.bind(this));
    this.benchmarkBtn.addEventListener('click', this.doBenchmark.bind(this));
    this.blurProcessHandler = new AsyncProcessHandler<number, void>(
      this.blurImage.bind(this),
      undefined,
      error => console.error('Blur failed:', error)
    );

    // Initialize WebGPU
    this.initWebGPU();
  }

  private async initWebGPU() {
    if (!navigator.gpu) {
      alert('WebGPU not supported on this browser.');
      return;
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      alert('No appropriate GPUAdapter found.');
      return;
    }

    this.device = await adapter.requestDevice({
      requiredFeatures: [
        "timestamp-query"
      ]
    });
    this.blurTimer = new GPUTimer(this.device);

    // Load default image
    this.loadDefaultImage();
  }

  private updateKernelRadius() {
    const radius = parseInt(this.kernelRadiusSlider.value);
    this.kernelRadiusValue.value = radius.toString();
    this.blurProcessHandler.request(radius);
  }

  private loadDefaultImage() {
    const img = new Image();
    img.src = defaultImage;
    img.onload = () => this.processImage(img);
  }

  private loadImageFromFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => this.processImage(img);
      };
      reader.readAsDataURL(file);
    }
  }

  private async doBenchmark() {
    const results: BenchmarkResults = await this.benchmark(1, 80);
    this.showBenchmark(results);
  }

  private async processImage(img: HTMLImageElement) {
    if (!this.device) {
      return;
    }

    // Free old resources
    this.inputTexture?.destroy();
    this.chart?.destroy();

    // Set canvas sizes
    this.originalCanvas.width = img.width;
    this.originalCanvas.height = img.height;
    this.blurredCanvas.width = img.width;
    this.blurredCanvas.height = img.height;
    this.originalCanvasTitle.innerText = `Original Image (${img.width}x${img.height})`;

    // Initialize the blur effect class
    // Fix channel order from BGRA to RGBA to avoid adapting image data format
    const format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat().replace('bgra', 'rgba') as GPUTextureFormat;
    this.gaussBlur?.destroy();
    this.gaussBlur = await Gauss2dBlurOptimized.create(this.device, format, this.blurTimer ?? undefined);

    /////////////////////////////////////////////////////
    // Initialize original canvas context
    /////////////////////////////////////////////////////
    this.originalCtx = this.originalCanvas.getContext('2d', { willReadFrequently: true });

    // Draw original image
    this.originalCtx?.drawImage(img, 0, 0);

    // Always in RGBA format
    const imageData = this.originalCtx?.getImageData(0, 0, this.originalCanvas.width, this.originalCanvas.height);

    /////////////////////////////////////////////////////
    // Initialize blurred canvas context
    /////////////////////////////////////////////////////
    this.blurredCtx = this.blurredCanvas.getContext('webgpu');
    if (!this.blurredCtx) {
      return;
    }

    this.blurredCtx.configure({
      device: this.device,
      format
    });

    if (imageData) {
      this.inputTexture = generateTexture(
        this.device,
        this.blurredCtx.getCurrentTexture().format,
        this.originalCanvas.width,
        this.originalCanvas.height,
        imageData.data,
        GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
        "inputTexture"
      );

      // Blur the image
      return this.blurProcessHandler.request(parseInt(this.kernelRadiusSlider.value));
    }
  }

  private async blurImage(kernelRadius: number) {
    if (!this.inputTexture || !this.blurredCtx || !this.gaussBlur || !this.blurTimer) {
      return;
    }

    // Apply Gaussian blur
    await this.gaussBlur.blur(this.inputTexture, kernelRadius, this.blurredCtx.getCurrentTexture());

    // Update UI with timing
    const elapsed = await this.blurTimer.read();
    this.blurredCanvasTitle.innerText = `Blurred Image (k = ${kernelRadius}, ${this.blurTimer.fmtTime(elapsed)})`;
  }

  private async benchmark(radiusMin: number, radiusMax: number) {
    if (!this.device || !this.inputTexture || !this.blurredCtx || !this.gaussBlur || !this.blurTimer) {
      return {
        size: {
          width: 0,
          height: 0
        },
        data: [],
        optData: []
      };
    }

    let gaussBlurSlow: Gauss2dBlur | undefined;
    try {
      this.defaultImageBtn.disabled = true;
      this.kernelRadiusSlider.disabled = true;
      this.benchmarkBtn.disabled = true;
      this.imageLoader.disabled = true;

      gaussBlurSlow = await Gauss2dBlur.create(this.device, this.inputTexture.format, this.blurTimer ?? undefined);

      // Warm up
      console.log("Warming up...");
      for (let radius = radiusMin; radius < radiusMax; radius++) {
        console.log(`Blurring with radius ${radius}...`);
        await gaussBlurSlow.blur(this.inputTexture, radius, this.blurredCtx.getCurrentTexture());
        await this.blurTimer.read();
      }

      // Benchmark
      console.log("Benchmark...");
      const results: BenchmarkResults = {
        size: {
          width: this.inputTexture.width,
          height: this.inputTexture.height
        },
        data: [],
        optData: []
      };

      for (let radius = radiusMin; radius < radiusMax; radius++) {
        console.log(`Blurring with radius ${radius}...`);

        await gaussBlurSlow.blur(this.inputTexture, radius, this.blurredCtx.getCurrentTexture());
        const timeMsSlow = (await this.blurTimer.read()) * 1e-6;

        results.data.push({
          x: radius,
          y: timeMsSlow
        });

        await this.gaussBlur.blur(this.inputTexture, radius, this.blurredCtx.getCurrentTexture());
        const timeMsFast = (await this.blurTimer.read()) * 1e-6;
        results.optData.push({
          x: radius,
          y: timeMsFast
        });
      }

      return results;
    } finally {
      this.imageLoader.disabled = false;
      this.kernelRadiusSlider.disabled = false;
      this.benchmarkBtn.disabled = false;
      this.defaultImageBtn.disabled = false;

      gaussBlurSlow?.destroy();
    }
  }

  private showBenchmark(results: BenchmarkResults) {
    // Compute quadratic regression
    const fit = new Model();
    fit.fit(
      results.data.map(({x, y}) => [x, y]),
      [2]
    );

    const xValues = results.data.map(d => d.x);
    const trendlineData = xValues.map(x => ({
      x,
      y: fit.estimate(2, x)
    }));

    // Build the chart
    this.chart?.destroy();
    this.chart = new Chart(this.benchmarkCanvas, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: `Blur Time (${results.size.width}x${results.size.height})`,
            data: results.data,
            backgroundColor: 'rgb(75, 192, 192)'
          },
          {
            label: `Optimized Blur Time`,
            data: results.optData,
            backgroundColor: 'rgb(87,192,75)'
          },
          {
            label: 'Quadratic Trendline',
            data: trendlineData,
            type: 'line',
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        aspectRatio: 1,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Radius'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Time (ms)'
            }
          }
        }
      }
    });
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new WebGPUImageBlur();
});
