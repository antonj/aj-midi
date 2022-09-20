declare var sampleRate: number; // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope
declare var currentTime: number; // https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope

interface IAudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: IAudioWorkletProcessor;
  new (options?: AudioWorkletNodeOptions): IAudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: new (
    options?: AudioWorkletNodeOptions
  ) => IAudioWorkletProcessor
): void;
