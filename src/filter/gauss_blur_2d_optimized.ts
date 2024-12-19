import { GPUTimer } from "@/webgpu/timer.ts";
import { castToFloat, channelMask, TexelType, TEXTURE_FORMAT_INFO } from "@/webgpu/texture_metadata.ts";

export class Gauss2dBlurOptimized {
  private readonly device: GPUDevice;
  private readonly uniformBuffer: GPUBuffer;
  private readonly renderPipeline: GPURenderPipeline;
  private readonly timer: GPUTimer | undefined;
  private workingTexture: GPUTexture | undefined;

  static async create(device: GPUDevice, inputFormat: GPUTextureFormat, timer?: GPUTimer) {
    const inputInfo = TEXTURE_FORMAT_INFO[inputFormat]!;

    // Create uniform buffer for variance
    const uniformBuffer = device.createBuffer({
      size: 8,
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

    return new Gauss2dBlurOptimized(device, uniformBuffer, renderPipeline, timer);
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

    // Ensure that working texture is usable
    this.ensureTextures(inputTexture);

    // Perform two 1D pass blur
    this.gaussBlur1dPass(inputTexture, this.workingTexture!, kernelRadius, 0);
    this.gaussBlur1dPass(this.workingTexture!, outputTexture, kernelRadius, 1);

    return outputTexture;
  }

  private ensureTextures(inputTexture: GPUTexture) {
    if (this.needsRecreation(inputTexture)) {
      this.destroyTextures();

      console.log("Creating textures...");

      this.workingTexture = this.device.createTexture({
        size: {
          width: inputTexture.width,
          height: inputTexture.height
        },
        format: inputTexture.format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
      });
    }
  }

  private needsRecreation(inputTexture: GPUTexture) {
    return !this.workingTexture || this.workingTexture.width < inputTexture.width || this.workingTexture.height < inputTexture.height;
  }

  private gaussBlur1dPass(inputTex: GPUTexture, outTex: GPUTexture, kernelRadius: number, blurDirection: 0 | 1) {
      const commandEncoder = this.device.createCommandEncoder();

      // Update the uniform buffer
      this.device.queue.writeBuffer(this.uniformBuffer!, 0, new Int32Array([ kernelRadius, blurDirection ]));

      // Perform render pass
      const passEncoder = commandEncoder.beginRenderPass({
        ...this.timer?.renderPass,
        colorAttachments: [{
          view: outTex.createView(),
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
            { binding: 0, resource: inputTex.createView() },
            { binding: 1, resource: { buffer: this.uniformBuffer! } }
          ]
        })
      );

      // 6 vertices for full-screen quad
      passEncoder.draw(6);
      passEncoder.end();
      this.timer?.resolveQuerySet(commandEncoder); // TODO: Check this
      this.device.queue.submit([commandEncoder.finish()]);
  }

  destroyTextures() {
    console.log("Destroying textures...");
    this.workingTexture?.destroy();
  }

  destroy() {
    this.destroyTextures();
    this.uniformBuffer?.destroy();
  }
}

export async function gauss2dBlurOptimized(
  device: GPUDevice,
  inputTexture: GPUTexture,
  kernelRadius: number,
  outputTexture?: GPUTexture,
  timer?: GPUTimer
): Promise<GPUTexture> {
  return (await Gauss2dBlurOptimized.create(device, inputTexture.format, timer)).blur(inputTexture, kernelRadius, outputTexture);
}

function gauss2dBlurShader(format: GPUTextureFormat): string {
  const formatInfo = TEXTURE_FORMAT_INFO[format]!;

  // language=WGSL
  return `
		struct VertexOutput {
		  @builtin(position) position: vec4f
		};
	
		struct Params {
			kernelRadius: i32,

			// 0 = W, 1 = H
			direction: i32
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
		
		fn blurW(coords: vec2i, stdDev: f32) -> ${formatInfo.texelType} {		 
		  let norm = 1.0 / sqrt(2.0 * PI * stdDev * stdDev);

		  // Gaussian blur kernel generation
		  var blur = ${castToFloat(formatInfo.texelType)}(0);
		  
		  // Since we are discretizing the Gaussian kernel, the sum of the samples won't add up perfectly to 1
		  var weightSum = 0.0f; 
		  
		  for (var i = -params.kernelRadius; i <= params.kernelRadius; i++) {
			  let weight = exp(-(f32(i * i) / (2.0 * stdDev * stdDev)));
        // fn textureLoad(t: texture_2d<ST>, coords: vec2<C>, level: L) -> vec4<ST>
			  let I = textureLoad(inputTexture, coords + vec2i(i, 0), 0).${channelMask(formatInfo.channelsCount)};
			  let gij = norm * weight;

			  blur += ${castToFloat(formatInfo.texelType)}(I) * gij;			  			  
			  weightSum += gij; 
		  }		 
		  
			// Normalize the result by dividing by the sum of the weights
			blur /= weightSum;
			${formatInfo.channelsCount === 4 ? "blur.a = 1.0f;" : "" }
			return ${formatInfo.texelType}(blur);
		}

		fn blurH(coords: vec2i, stdDev: f32) -> ${formatInfo.texelType} {		 
		  let norm = 1.0 / sqrt(2.0 * PI * stdDev * stdDev);

		  // Gaussian blur kernel generation
		  var blur = ${castToFloat(formatInfo.texelType)}(0);
		  
		  // Since we are discretizing the Gaussian kernel, the sum of the samples won't add up perfectly to 1
		  var weightSum = 0.0f; 
		  
		  for (var j = -params.kernelRadius; j <= params.kernelRadius; j++) {
			  let weight = exp(-(f32(j * j) / (2.0 * stdDev * stdDev)));
        // fn textureLoad(t: texture_2d<ST>, coords: vec2<C>, level: L) -> vec4<ST>
			  let I = textureLoad(inputTexture, coords + vec2i(0, j), 0).${channelMask(formatInfo.channelsCount)};
			  let gij = norm * weight;

			  blur += ${castToFloat(formatInfo.texelType)}(I) * gij;			 			  
			  weightSum += gij; 
		  }		 
		  
			// Normalize the result by dividing by the sum of the weights
			blur /= weightSum;
			${formatInfo.channelsCount === 4 ? "blur.a = 1.0f;" : "" }
      return ${formatInfo.texelType}(blur);
		}

		@fragment
		fn fs(@builtin(position) coord: vec4f) -> @location(0) ${formatInfo.texelType} {
		  // 99% of Gaussian values fall within 3 * stdDev
		  // P(mu - 3s <= X <= mu + 3s) = 0.9973		
		  let stdDev = f32(params.kernelRadius) / 3.0;

		  // Gaussian blur kernel generation
		  let pixelCoords = vec2i(coord.xy - 0.5);
		  var blur: ${formatInfo.texelType};
		  if (params.direction == 0) {
		  	blur = blurW(pixelCoords, stdDev);
		  } else {
		  	blur = blurH(pixelCoords, stdDev);
		  }

		  return blur;
		}
	  `;
}
