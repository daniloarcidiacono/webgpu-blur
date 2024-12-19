export type SampleType = 'f32' | 'u32' | 'i32';
export type TexelType = 'f32' | 'u32' | 'i32' |
  'vec2f' | 'vec2u' | 'vec2i' |
  'vec3f' | 'vec3u' | 'vec3i' |
  'vec4f' | 'vec4u' | 'vec4i';

export type TypedArray = Float32Array
  | Float64Array
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

export type TypedArrayConstructor = Float32ArrayConstructor
  | Float64ArrayConstructor
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Uint8ClampedArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor;

export interface TextureFormatInfo {
  bytesPerTexel: number;
  channelsCount: 1 | 2 | 3 | 4;
  sampleType: SampleType;
  texelType: TexelType;
  textureSamplerType: GPUTextureSampleType;
  typedArrayConstructor: TypedArrayConstructor;
}

export const TEXTURE_FORMAT_INFO: { [ texelFormat in GPUTextureFormat ]?: TextureFormatInfo } = {
  "r32float": {
    bytesPerTexel: 4,
    channelsCount: 1,
    sampleType: 'f32',
    texelType: 'f32',
    textureSamplerType: 'float',
    typedArrayConstructor: Float32Array
  },
  "rgba32float": {
    bytesPerTexel: 16,
    channelsCount: 4,
    sampleType: 'f32',
    texelType: 'vec4f',
    textureSamplerType: 'float',
    typedArrayConstructor: Float32Array
  },
  "rgba8uint": {
    bytesPerTexel: 4,
    channelsCount: 4,
    sampleType: 'u32',
    texelType: 'vec4u',
    textureSamplerType: 'uint',
    typedArrayConstructor: Uint8ClampedArray
  },
  "r8uint": {
    bytesPerTexel: 1,
    channelsCount: 1,
    sampleType: 'u32',
    texelType: 'u32',
    textureSamplerType: 'uint',
    typedArrayConstructor: Uint8Array
  },
  "rgba8unorm": {
    bytesPerTexel: 4,
    channelsCount: 4,
    sampleType: 'f32',
    texelType: 'vec4f',
    textureSamplerType: 'float',
    typedArrayConstructor: Uint8ClampedArray
  },
  "bgra8unorm": {
    bytesPerTexel: 4,
    channelsCount: 4,
    sampleType: 'f32',
    texelType: 'vec4f',
    textureSamplerType: 'float',
    typedArrayConstructor: Uint8ClampedArray
  }
};

export function castToFloat(texelType: TexelType): TexelType {
  switch (texelType) {
    case "f32": return "f32";
    case "u32": return "f32";
    case "i32": return "f32";
    case "vec2f": return "vec2f";
    case "vec2u": return "vec2f";
    case "vec2i": return "vec2f";
    case "vec3f": return "vec3f";
    case "vec3u": return "vec3f";
    case "vec3i": return "vec3f";
    case "vec4f": return "vec4f";
    case "vec4u": return "vec4f";
    case "vec4i": return "vec4f";
  }
}

export function channelMask(channelCount: 1 | 2 | 3 | 4): string {
  switch (channelCount) {
    case 1: return "r";
    case 2: return "rg";
    case 3: return "rgb";
    case 4: return "rgba";
  }
}
