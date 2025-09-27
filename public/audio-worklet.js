"use strict";
(() => {
  // app/util/pianolizer.ts
  var Pianolizer = class {
    slidingDFT;
    /**
     * Creates an instance of Pianolizer.
     * @param {Number} sampleRate in Hz. This directly influences the memory usage: 44100Hz or 48000Hz will both allocate a buffer of 64KB (provided 32-bit floats are used).
     * @memberof Pianolizer
     */
    constructor(sampleRate2, options = {
      keysNum: 61,
      referenceKey: 33,
      pitchFork: 440
    }) {
      this.slidingDFT = new SlidingDFT(new PianoTuning(sampleRate2, options), -1);
    }
    /**
     * Process a batch of samples.
     *
     * @param {Float32Array} samples Array with the batch of samples to process.
     * @param {Number} [averageWindowInSeconds=0] Adjust the moving average window size.
     * @return {Float32Array} Snapshot of the levels after processing all the samples.
     * @memberof Pianolizer
     */
    process(samples, averageWindowInSeconds = 0) {
      return this.slidingDFT.process(samples, averageWindowInSeconds);
    }
  };
  var Complex = class _Complex {
    re;
    im;
    /**
     * Creates an instance of Complex.
     * @param {Number} [re=0] Real part.
     * @param {Number} [im=0] Imaginary part.
     * @memberof Complex
     * @example
     * let dft = new Complex()
     * dft = dft
     *   .sub(previousComplexSample)
     *   .add(currentComplexSample)
     *   .mul(coeff)
     * console.log(dft.magnitude)
     */
    constructor(re = 0, im = 0) {
      this.re = re;
      this.im = im;
    }
    /**
     * Complex number addition.
     *
     * @param {Complex} z Complex number to add.
     * @return {Complex} Sum of the instance and z.
     * @memberof Complex
     */
    add(z) {
      return new _Complex(this.re + z.re, this.im + z.im);
    }
    /**
     * Complex number subtraction.
     *
     * @param {Complex} z Complex number to subtract.
     * @return {Complex} Sum of the instance and z.
     * @memberof Complex
     */
    sub(z) {
      return new _Complex(this.re - z.re, this.im - z.im);
    }
    /**
     * Complex number multiplication.
     *
     * @param {Complex} z Complex number to multiply.
     * @return {Complex} Product of the instance and z.
     * @memberof Complex
     */
    mul(z) {
      return new _Complex(
        this.re * z.re - this.im * z.im,
        this.re * z.im + this.im * z.re
      );
    }
    /**
     * Complex number norm value.
     *
     * @readonly
     * @memberof Complex
     */
    get norm() {
      return this.re * this.re + this.im * this.im;
    }
    /**
     * Complex number magnitude.
     *
     * @readonly
     * @memberof Complex
     */
    get magnitude() {
      return Math.sqrt(this.norm);
    }
  };
  var RingBuffer = class {
    size;
    mask;
    buffer;
    index;
    /**
     * Creates an instance of RingBuffer.
     * @param {Number} requestedSize How long the RingBuffer is expected to be.
     * @memberof RingBuffer
     */
    constructor(requestedSize) {
      const bits = Math.ceil(Math.log2(requestedSize)) | 0;
      this.size = 1 << bits;
      this.mask = this.size - 1;
      this.buffer = new Float32Array(this.size);
      this.index = 0;
    }
    /**
     * Shifts the RingBuffer and stores the value in the latest position.
     *
     * @param {Number} value Value to be stored in an Float32Array.
     * @memberof RingBuffer
     */
    write(value) {
      this.index &= this.mask;
      this.buffer[this.index++] = value;
    }
    /**
     * Retrieves the value stored at the position.
     *
     * @param {Number} position Position within the RingBuffer.
     * @return {Number} The value at the position.
     * @memberof RingBuffer
     */
    read(position) {
      return this.buffer[this.index + ~position & this.mask];
    }
  };
  var DFTBin = class {
    k;
    N;
    r;
    coeff;
    dft;
    totalPower;
    referenceAmplitude;
    /**
     * Creates an instance of DFTBin.
     * @param {Number} k Frequency divided by the bandwidth (must be an integer!).
     * @param {Number} N Sample rate divided by the bandwidth (must be an integer!).
     * @memberof DFTBin
     * @example
     * // (provided the sample rate of 44100Hz)
     * // center: 439.96Hz
     * // bandwidth: 25.88Hz
     * const bin = new DFTBin(17, 1704)
     * // samples are *NOT* complex!
     * bin.update(previousSample, currentSample)
     */
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
    /**
     * Do the Sliding DFT computation.
     *
     * @param {Number} previousSample Sample from N frames ago.
     * @param {Number} currentSample The latest sample.
     * @memberof DFTBin
     */
    update(previousSample, currentSample) {
      this.totalPower += currentSample * currentSample;
      this.totalPower -= previousSample * previousSample;
      const previousComplexSample = new Complex(previousSample, 0);
      const currentComplexSample = new Complex(currentSample, 0);
      this.dft = this.dft.sub(previousComplexSample).add(currentComplexSample).mul(this.coeff);
    }
    /**
     * Root Mean Square.
     *
     * @readonly
     * @memberof DFTBin
     */
    get rms() {
      return Math.sqrt(this.totalPower / this.N);
    }
    /**
     * Amplitude spectrum in volts RMS.
     *
     * @see {@link https://www.sjsu.edu/people/burford.furman/docs/me120/FFT_tutorial_NI.pdf}
     * @readonly
     * @memberof DFTBin
     */
    get amplitudeSpectrum() {
      return Math.SQRT2 * this.dft.magnitude / this.N;
    }
    /**
     * Normalized amplitude (always returns a value between 0.0 and 1.0).
     * This is well suited to detect pure tones, and can be used to decode DTMF or FSK modulation.
     * Depending on the application, you might need Math.sqrt(d.normalizedAmplitudeSpectrum).
     *
     * @readonly
     * @memberof DFTBin
     */
    get normalizedAmplitudeSpectrum() {
      return this.totalPower > 0 ? (
        // ? this.amplitudeSpectrum / this.rms
        this.r * this.dft.norm / this.totalPower
      ) : 0;
    }
    /**
     * Using this unit of measure, it is easy to view wide dynamic ranges; that is,
     * it is easy to see small signal components in the presence of large ones.
     *
     * @readonly
     * @memberof DFTBin
     */
    get logarithmicUnitDecibels() {
      return 20 * Math.log10(this.amplitudeSpectrum / this.referenceAmplitude);
    }
  };
  var MovingAverage = class {
    channels;
    sampleRate;
    sum;
    averageWindow;
    targetAverageWindow;
    /**
     * Creates an instance of MovingAverage.
     * @param {Number} channels Number of channels to process.
     * @param {Number} sampleRate Sample rate, used to convert between time and amount of samples.
     * @memberof MovingAverage
     */
    constructor(channels, sampleRate2) {
      this.channels = channels;
      this.sampleRate = sampleRate2;
      this.sum = new Float32Array(channels);
      this.averageWindow = 0;
      this.targetAverageWindow = 0;
    }
    /**
     * Get the current window size (in seconds).
     *
     * @memberof MovingAverage
     */
    get averageWindowInSeconds() {
      return this.averageWindow / this.sampleRate;
    }
    /**
     * Set the current window size (in seconds).
     *
     * @memberof MovingAverage
     */
    set averageWindowInSeconds(value) {
      this.targetAverageWindow = Math.round(value * this.sampleRate);
      if (this.averageWindow === null) {
        this.averageWindow = this.targetAverageWindow;
      }
    }
    /**
     * Adjust averageWindow in steps.
     *
     * @memberof MovingAverage
     */
    updateAverageWindow() {
      if (this.targetAverageWindow > this.averageWindow) {
        this.averageWindow++;
      } else if (this.targetAverageWindow < this.averageWindow) {
        this.averageWindow--;
      }
    }
    /**
     * Retrieve the current moving average value for a given channel.
     *
     * @param {Number} n Number of channel to retrieve the moving average for.
     * @return {Number} Current moving average value for the specified channel.
     * @memberof MovingAverage
     */
    read(n) {
      return this.sum[n] / this.averageWindow;
    }
    update(levels) {
    }
  };
  var FastMovingAverage = class extends MovingAverage {
    /**
     * Update the internal state with from the input.
     *
     * @param {Float32Array} levels Array of level values, one per channel.
     * @memberof FastMovingAverage
     */
    update(levels) {
      this.updateAverageWindow();
      for (let n = 0; n < this.channels; n++) {
        const currentSum = this.sum[n];
        this.sum[n] = this.averageWindow ? currentSum + levels[n] - currentSum / this.averageWindow : levels[n];
      }
    }
  };
  var HeavyMovingAverage = class extends MovingAverage {
    history;
    /**
     * Creates an instance of HeavyMovingAverage.
     * @param {Number} channels Number of channels to process.
     * @param {Number} sampleRate Sample rate, used to convert between time and amount of samples.
     * @param {Number} [maxWindow=sampleRate] Preallocate buffers of this size, per channel.
     * @memberof HeavyMovingAverage
     */
    constructor(channels, sampleRate2, maxWindow = sampleRate2) {
      super(channels, sampleRate2);
      this.history = [];
      for (let n = 0; n < channels; n++) {
        this.history.push(new RingBuffer(maxWindow));
      }
    }
    /**
     * Update the internal state with from the input.
     *
     * @param {Float32Array} levels Array of level values, one per channel.
     * @memberof HeavyMovingAverage
     */
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
    sampleRate;
    bands;
    /**
     * Creates an instance of Tuning.
     * @param {Number} sampleRate Self-explanatory.
     * @param {Number} bands How many filters.
     */
    constructor(sampleRate2, bands) {
      this.sampleRate = sampleRate2;
      this.bands = bands;
    }
    /**
     * Approximate k & N values for DFTBin.
     *
     * @param {Number} frequency In Hz.
     * @param {Number} bandwidth In Hz.
     * @return {Object} Object containing k & N that best approximate for the given frequency & bandwidth.
     * @memberof Tuning
     */
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
    pitchFork;
    referenceKey;
    /**
     * Creates an instance of PianoTuning.
     * @param {number} sampleRate This directly influences the memory usage: 44100Hz or 48000Hz will both allocate a buffer of 64KB (provided 32-bit floats are used).
     * @memberof PianoTuning
     */
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
    /**
     * Converts the piano key number to it's fundamental frequency.
     *
     * @see {@link https://en.wikipedia.org/wiki/Piano_key_frequencies}
     * @param {Number} key
     * @return {Number} frequency
     * @memberof PianoTuning
     */
    keyToFreq(key) {
      return this.pitchFork * Math.pow(2, (key - this.referenceKey) / 12);
    }
    /**
     * Computes the array of objects that specify the frequencies to analyze.
     *
     * @readonly
     * @memberof PianoTuning
     */
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
    sampleRate;
    bands;
    levels;
    bins;
    ringBuffer;
    movingAverage;
    /**
     * Creates an instance of SlidingDFT.
     * @param {PianoTuning} tuning Tuning instance (a class derived from Tuning; for instance, PianoTuning).
     * @param {Number} [maxAverageWindowInSeconds=0] Positive values are passed to MovingAverage implementation; negative values trigger FastMovingAverage implementation. Zero disables averaging.
     * @memberof SlidingDFT
     */
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
    /**
     * Process a batch of samples.
     *
     * @param {Float32Array} samples Array with the batch of samples to process. Value range is irrelevant (can be from -1.0 to 1.0 or 0 to 255 or whatever, as long as it is consistent).
     * @param {Number} [averageWindowInSeconds=0] Adjust the moving average window size.
     * @return {Float32Array} Snapshot of the *squared* levels after processing all the samples. Value range is between 0.0 and 1.0. Depending on the application, you might need Math.sqrt() of the level values (for visualization purposes it is actually better as is).
     * @memberof SlidingDFT
     */
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
    updateInterval;
    nextUpdateFrame;
    pianolizer;
    samples;
    /**
     * Creates an instance of PianolizerWorklet.
     * @memberof PianolizerWorklet
     */
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
    /**
     * Definition of the 'smooth' parameter.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/parameterDescriptors}
     * @readonly
     * @static
     * @memberof PianolizerWorklet
     */
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
    /**
     * SDFT processing algorithm for the audio processor worklet.
     *
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process}
     * @param {Array} input An array of inputs connected to the node, each item of which is, in turn, an array of channels. Each channel is a Float32Array containing N samples.
     * @param {Array} output Unused.
     * @param {Object} parameters We only need the value under the key 'smooth'.
     * @return {Boolean} Always returns true, so as to to keep the node alive.
     * @memberof PianolizerWorklet
     */
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
