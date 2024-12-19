import { GPUTimer } from "@/webgpu/timer.ts";
import { castToFloat, channelMask, TEXTURE_FORMAT_INFO } from "@/webgpu/texture_metadata.ts";

export class Gauss2dBlur {
  private readonly device: GPUDevice;
  private readonly uniformBuffer: GPUBuffer;
  private readonly renderPipeline: GPURenderPipeline;
  private readonly timer: GPUTimer | undefined;

  static async create(device: GPUDevice, inputFormat: GPUTextureFormat, timer?: GPUTimer) {
    const inputInfo = TEXTURE_FORMAT_INFO[inputFormat]!;

    // Create uniform buffer
    const uniformBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    // Create shader module
    device.pushErrorScope('validation');
    const code = gauss2dBlurShader(inputFormat);
    const shaderModule = device.createShaderModule({
      code
    });
    const errors = await device.popErrorScope();
    if (errors) {
      throw new Error('Could not compile shader!');
    }

    // Create render pipeline
    const renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [
          device.createBindGroupLayout({
            entries: [
              { binding: 0, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: inputInfo.textureSamplerType } },
              { binding: 1, visibility: GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } }
            ]
          })
        ]
      }),
      vertex: {
        module: shaderModule,
        entryPoint: 'vs'
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs',
        targets: [{ format: inputFormat }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });

    return new Gauss2dBlur(device, uniformBuffer, renderPipeline, timer);
  }

  private constructor(
    device: GPUDevice,
    uniformBuffer: GPUBuffer,
    renderPipeline: GPURenderPipeline,
    timer?: GPUTimer
  ) {
    this.device = device;
    this.uniformBuffer = uniformBuffer;
    this.renderPipeline = renderPipeline;
    this.timer = timer;
  }

  async blur(
    inputTexture: GPUTexture,
    kernelRadius: number,
    outputTexture?: GPUTexture
  ): Promise<GPUTexture> {
    if (outputTexture) {
      if (outputTexture.width !== inputTexture.width || outputTexture.height !== inputTexture.height) {
        throw new Error('Output texture size does not match input texture!');
      }
      if (outputTexture.format !== inputTexture.format) {
        throw new Error('Output format does not match input format!');
      }
    } else {
      outputTexture = this.device.createTexture({
        size: {
          width: inputTexture.width,
          height: inputTexture.height
        },
        format: inputTexture.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
      });
    }

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();
    this.device.queue.writeBuffer(this.uniformBuffer, 0, new Int32Array([ kernelRadius ]));

    // Perform render pass
    const passEncoder = commandEncoder.beginRenderPass({
      ...this.timer?.renderPass,
      colorAttachments: [{
        view: outputTexture.createView(),
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(
      0,
      this.device.createBindGroup({
        layout: this.renderPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: inputTexture.createView() },
          { binding: 1, resource: { buffer: this.uniformBuffer } }
        ]
      })
    );

    // 6 vertices for full-screen quad
    passEncoder.draw(6);
    passEncoder.end();
    this.timer?.resolveQuerySet(commandEncoder);
    this.device.queue.submit([commandEncoder.finish()]);

    // Done
    return outputTexture;
  }

  destroy() {
    this.uniformBuffer?.destroy();
  }
}

export async function gauss2dBlur(
  device: GPUDevice,
  inputTexture: GPUTexture,
  kernelRadius: number,
  outputTexture?: GPUTexture,
  timer?: GPUTimer
): Promise<GPUTexture> {
  const gauss2d = await Gauss2dBlur.create(device, inputTexture.format, timer);

  try {
    return gauss2d.blur(inputTexture, kernelRadius, outputTexture);
  } finally {
    gauss2d.destroy();
  }
}

function gauss2dBlurShader(format: GPUTextureFormat): string {
  const formatInfo = TEXTURE_FORMAT_INFO[format]!;

  // language=WGSL
  return `
		struct VertexOutput {
		  @builtin(position) position: vec4f
		};
	
		struct Params {
			kernelRadius: i32
		}
		
		@group(0) @binding(0) var inputTexture: texture_2d<${formatInfo.sampleType}>;
		@group(0) @binding(1) var<uniform> params: Params;
	
		@vertex
		fn vs(@builtin(vertex_index) index: u32) -> VertexOutput {
		  let pos = array<vec2f, 6>(
        vec2f(-1, 1),
        vec2f(1, 1),
        vec2f(1, -1),
        vec2f(1, -1),
        vec2f(-1, -1),
        vec2f(-1, 1)
		  );
	
		  var output: VertexOutput;
		  output.position = vec4f(pos[index], 0.0, 1.0);
		  return output;
		}
	
		const PI: f32 = 3.141592;

		@fragment
		fn fs(@builtin(position) coord: vec4f) -> @location(0) ${formatInfo.texelType} {
		  // 99% of Gaussian values fall within 3 * stdDev
		  // P(mu - 3s <= X <= mu + 3s) = 0.9973		
		  let stdDev = f32(params.kernelRadius) / 3.0;
		  
		  // Gaussian blur kernel generation
		  let pixelCoords = vec2i(coord.xy - 0.5);
		  let norm = 1.0 / (2.0 * PI * stdDev * stdDev);

		  // Gaussian blur kernel generation
		  var blur = ${castToFloat(formatInfo.texelType)}(0);
		  
		  // Since we are discretizing the Gaussian kernel, the sum of the samples won't add up perfectly to 1
		  var weightSum = 0.0f; 
		  
		  for (var i = -params.kernelRadius; i <= params.kernelRadius; i++) {
        for (var j = -params.kernelRadius; j <= params.kernelRadius; j++) {
          let offset = vec2f(f32(i), f32(j));
          let weight = exp(-(dot(offset, offset) / (2.0 * stdDev * stdDev)));
          // fn textureLoad(t: texture_2d<ST>, coords: vec2<C>, level: L) -> vec4<ST>
		      let I = textureLoad(inputTexture, pixelCoords + vec2i(i, j), 0).${channelMask(formatInfo.channelsCount)};
          let gij = norm * weight;

          blur += ${castToFloat(formatInfo.texelType)}(I) * gij;                    
          weightSum += gij; 
        }
		  }		 
		  
			// Normalize the result by dividing by the sum of the weights
			blur /= weightSum;
      ${formatInfo.channelsCount === 4 ? "blur.a = 1.0f;" : "" }
		 
      return ${formatInfo.texelType}(blur);
		}
	  `;
}
