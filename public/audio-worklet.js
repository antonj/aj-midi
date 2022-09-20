"use strict";
(() => {
  // app/util/pianolizer.ts
  var Pianolizer = class {
    constructor(sampleRate2, options = {
      keysNum: 61,
      referenceKey: 33,
      pitchFork: 440
    }) {
      this.slidingDFT = new SlidingDFT(new PianoTuning(sampleRate2, options), -1);
    }
    process(samples, averageWindowInSeconds = 0) {
      return this.slidingDFT.process(samples, averageWindowInSeconds);
    }
  };
  var Complex = class {
    constructor(re = 0, im = 0) {
      this.re = re;
      this.im = im;
    }
    add(z) {
      return new Complex(this.re + z.re, this.im + z.im);
    }
    sub(z) {
      return new Complex(this.re - z.re, this.im - z.im);
    }
    mul(z) {
      return new Complex(
        this.re * z.re - this.im * z.im,
        this.re * z.im + this.im * z.re
      );
    }
    get norm() {
      return this.re * this.re + this.im * this.im;
    }
    get magnitude() {
      return Math.sqrt(this.norm);
    }
  };
  var RingBuffer = class {
    constructor(requestedSize) {
      const bits = Math.ceil(Math.log2(requestedSize)) | 0;
      this.size = 1 << bits;
      this.mask = this.size - 1;
      this.buffer = new Float32Array(this.size);
      this.index = 0;
    }
    write(value) {
      this.index &= this.mask;
      this.buffer[this.index++] = value;
    }
    read(position) {
      return this.buffer[this.index + ~position & this.mask];
    }
  };
  var DFTBin = class {
    constructor(k, N) {
      if (k === 0) {
        throw new RangeError("k=0 (DC) not implemented");
      } else if (N === 0) {
        throw new RangeError("N=0 is so not supported (Y THO?)");
      } else if (k !== Math.round(k)) {
        throw new RangeError("k must be an integer");
      } else if (N !== Math.round(N)) {
        throw new RangeError("N must be an integer");
      }
      this.k = k;
      this.N = N;
      const q = 2 * Math.PI * k / N;
      this.r = 2 / N;
      this.coeff = new Complex(Math.cos(q), -Math.sin(q));
      this.dft = new Complex();
      this.totalPower = 0;
      this.referenceAmplitude = 1;
    }
    update(previousSample, currentSample) {
      this.totalPower += currentSample * currentSample;
      this.totalPower -= previousSample * previousSample;
      const previousComplexSample = new Complex(previousSample, 0);
      const currentComplexSample = new Complex(currentSample, 0);
      this.dft = this.dft.sub(previousComplexSample).add(currentComplexSample).mul(this.coeff);
    }
    get rms() {
      return Math.sqrt(this.totalPower / this.N);
    }
    get amplitudeSpectrum() {
      return Math.SQRT2 * this.dft.magnitude / this.N;
    }
    get normalizedAmplitudeSpectrum() {
      return this.totalPower > 0 ? this.r * this.dft.norm / this.totalPower : 0;
    }
    get logarithmicUnitDecibels() {
      return 20 * Math.log10(this.amplitudeSpectrum / this.referenceAmplitude);
    }
  };
  var MovingAverage = class {
    constructor(channels, sampleRate2) {
      this.channels = channels;
      this.sampleRate = sampleRate2;
      this.sum = new Float32Array(channels);
      this.averageWindow = 0;
      this.targetAverageWindow = 0;
    }
    get averageWindowInSeconds() {
      return this.averageWindow / this.sampleRate;
    }
    set averageWindowInSeconds(value) {
      this.targetAverageWindow = Math.round(value * this.sampleRate);
      if (this.averageWindow === null) {
        this.averageWindow = this.targetAverageWindow;
      }
    }
    updateAverageWindow() {
      if (this.targetAverageWindow > this.averageWindow) {
        this.averageWindow++;
      } else if (this.targetAverageWindow < this.averageWindow) {
        this.averageWindow--;
      }
    }
    read(n) {
      return this.sum[n] / this.averageWindow;
    }
    update(levels) {
    }
  };
  var FastMovingAverage = class extends MovingAverage {
    update(levels) {
      this.updateAverageWindow();
      for (let n = 0; n < this.channels; n++) {
        const currentSum = this.sum[n];
        this.sum[n] = this.averageWindow ? currentSum + levels[n] - currentSum / this.averageWindow : levels[n];
      }
    }
  };
  var HeavyMovingAverage = class extends MovingAverage {
    constructor(channels, sampleRate2, maxWindow = sampleRate2) {
      super(channels, sampleRate2);
      this.history = [];
      for (let n = 0; n < channels; n++) {
        this.history.push(new RingBuffer(maxWindow));
      }
    }
    update(levels) {
      for (let n = 0; n < this.channels; n++) {
        const value = levels[n];
        this.history[n].write(value);
        this.sum[n] += value;
        if (this.targetAverageWindow === this.averageWindow) {
          this.sum[n] -= this.history[n].read(this.averageWindow);
        } else if (this.targetAverageWindow < this.averageWindow) {
          this.sum[n] -= this.history[n].read(this.averageWindow);
          this.sum[n] -= this.history[n].read(this.averageWindow - 1);
        }
      }
      this.updateAverageWindow();
    }
  };
  var Tuning = class {
    constructor(sampleRate2, bands) {
      this.sampleRate = sampleRate2;
      this.bands = bands;
    }
    frequencyAndBandwidthToKAndN(frequency, bandwidth) {
      let N = Math.floor(this.sampleRate / bandwidth);
      const k = Math.floor(frequency / bandwidth);
      let delta = Math.abs(this.sampleRate * (k / N) - frequency);
      for (let i = N - 1; ; i--) {
        const tmpDelta = Math.abs(this.sampleRate * (k / i) - frequency);
        if (tmpDelta < delta) {
          delta = tmpDelta;
          N = i;
        } else {
          return { k, N };
        }
      }
    }
  };
  var PianoTuning = class extends Tuning {
    constructor(sampleRate2, options = {
      keysNum: 61,
      referenceKey: 33,
      pitchFork: 440
    }) {
      console.log("set", options);
      super(sampleRate2, options.keysNum);
      this.pitchFork = options.pitchFork;
      this.referenceKey = options.referenceKey;
    }
    keyToFreq(key) {
      return this.pitchFork * Math.pow(2, (key - this.referenceKey) / 12);
    }
    get mapping() {
      const output = [];
      for (let key = 0; key < this.bands; key++) {
        const frequency = this.keyToFreq(key);
        const bandwidth = 2 * (this.keyToFreq(key + 0.5) - frequency);
        output.push(this.frequencyAndBandwidthToKAndN(frequency, bandwidth));
      }
      return output;
    }
  };
  var SlidingDFT = class {
    constructor(tuning, maxAverageWindowInSeconds = 0) {
      this.sampleRate = tuning.sampleRate;
      this.bands = tuning.bands;
      this.bins = [];
      this.levels = new Float32Array(this.bands);
      let maxN = 0;
      tuning.mapping.forEach((band) => {
        this.bins.push(new DFTBin(band.k, band.N));
        maxN = Math.max(maxN, band.N);
      });
      this.ringBuffer = new RingBuffer(maxN);
      if (maxAverageWindowInSeconds > 0) {
        this.movingAverage = new HeavyMovingAverage(
          this.bands,
          this.sampleRate,
          Math.round(this.sampleRate * maxAverageWindowInSeconds)
        );
      } else if (maxAverageWindowInSeconds < 0) {
        this.movingAverage = new FastMovingAverage(this.bands, this.sampleRate);
      } else {
        this.movingAverage = null;
      }
    }
    process(samples, averageWindowInSeconds = 0) {
      if (this.movingAverage !== null) {
        this.movingAverage.averageWindowInSeconds = averageWindowInSeconds;
      }
      const windowSize = samples.length;
      const binsNum = this.bins.length;
      for (let i = 0; i < windowSize; i++) {
        const currentSample = samples[i];
        samples[i] = 0;
        this.ringBuffer.write(currentSample);
        for (let band = 0; band < binsNum; band++) {
          const bin = this.bins[band];
          const previousSample = this.ringBuffer.read(bin.N);
          bin.update(previousSample, currentSample);
          this.levels[band] = bin.normalizedAmplitudeSpectrum;
        }
        if (this.movingAverage !== null) {
          this.movingAverage.update(this.levels);
        }
      }
      if (this.movingAverage !== null && this.movingAverage.averageWindow > 0) {
        for (let band = 0; band < binsNum; band++) {
          this.levels[band] = this.movingAverage.read(band);
        }
      }
      return this.levels;
    }
  };

  // public/audio-worklet.ts
  var PianolizerWorklet = class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.samples = null;
      this.pianolizer = new Pianolizer(sampleRate);
      this.updateInterval = 1 / 60;
      this.nextUpdateFrame = 0;
      this.port.onmessage = (ev) => {
        switch (ev.data.kind) {
          case "tuning": {
            console.log("event", ev.data.keysNum);
            this.pianolizer = new Pianolizer(sampleRate, ev.data);
            break;
          }
        }
      };
    }
    static get parameterDescriptors() {
      return [
        {
          name: "smooth",
          defaultValue: 0.04,
          minValue: 0,
          maxValue: 0.25,
          automationRate: "k-rate"
        },
        {
          name: "threshold",
          defaultValue: 0.05,
          minValue: 0,
          maxValue: 1,
          automationRate: "k-rate"
        }
      ];
    }
    process(input, output, parameters) {
      if (input[0].length === 0) {
        return true;
      }
      const windowSize = input[0][0].length;
      if (this.samples === null || this.samples.length !== windowSize) {
        this.samples = new Float32Array(windowSize);
      }
      let count = 0;
      const inputPortCount = input.length;
      for (let portIndex = 0; portIndex < inputPortCount; portIndex++) {
        const channelCount = input[portIndex].length;
        for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
          for (let sampleIndex = 0; sampleIndex < windowSize; sampleIndex++) {
            const sample = input[portIndex][channelIndex][sampleIndex];
            this.samples[sampleIndex] += sample;
            count++;
          }
        }
      }
      const n = count / windowSize;
      for (let i = 0; i < windowSize; i++) {
        this.samples[i] /= n;
      }
      const levels = this.pianolizer.process(this.samples, parameters.smooth[0]);
      if (this.nextUpdateFrame <= currentTime) {
        this.nextUpdateFrame = currentTime + this.updateInterval;
        for (let i = 0; i < levels.length; i++) {
          if (levels[i] < parameters.threshold[0]) {
            levels[i] = 0;
          }
        }
        this.port.postMessage(levels);
      }
      return true;
    }
  };
  registerProcessor("audio-worklet", PianolizerWorklet);
})();
/**
 * @file pianolizer.js
 * @description Musical tone pitch detection library based on the Sliding Discrete Fourier Transform algorithm.
 * @see {@link http://github.com/creaktive/pianolizer}
 * @author Stanislaw Pusep
 * @license MIT
 */
