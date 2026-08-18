/**
 * Procedural Web Audio API soundscape synthesizer.
 * Runs 100% in-browser with zero external assets/network requests.
 */

export type SoundscapeType = 'binaural_40hz' | 'rain' | 'brown_noise' | 'forest_wind';

export interface SoundscapePreset {
  id: SoundscapeType;
  label: string;
  detail: string;
  iconName: 'Sparkles' | 'CloudRain' | 'Waves' | 'Trees';
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'binaural_40hz',
    label: '40Hz Gamma Focus',
    detail: 'Binaural beats for high-level mental clarity & memory retention',
    iconName: 'Sparkles',
  },
  {
    id: 'rain',
    label: 'Calming Rain',
    detail: 'Procedural steady rain with gentle droplet resonance',
    iconName: 'CloudRain',
  },
  {
    id: 'brown_noise',
    label: 'Deep Brown Noise',
    detail: 'Rich low-frequency rumble to mask background chatter & distractions',
    iconName: 'Waves',
  },
  {
    id: 'forest_wind',
    label: 'Forest Canopy',
    detail: 'Gentle breeze modulation through ambient tree leaves',
    iconName: 'Trees',
  },
];

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: SoundscapeType | null = null;
  private cleanupNodes: Array<() => void> = [];
  private volume = 0.65;

  private initContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getCurrentType(): SoundscapeType | null {
    return this.currentType;
  }

  public isPlaying(): boolean {
    return this.currentType !== null;
  }

  public stop() {
    this.cleanupNodes.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore cleanup errors
      }
    });
    this.cleanupNodes = [];
    this.currentType = null;
  }

  public play(type: SoundscapeType) {
    this.stop();
    const ctx = this.initContext();
    this.currentType = type;

    switch (type) {
      case 'binaural_40hz':
        this.playBinaural40Hz(ctx);
        break;
      case 'rain':
        this.playRain(ctx);
        break;
      case 'brown_noise':
        this.playBrownNoise(ctx);
        break;
      case 'forest_wind':
        this.playForestWind(ctx);
        break;
    }
  }

  private playBinaural40Hz(ctx: AudioContext) {
    // 200 Hz Carrier Left, 240 Hz Carrier Right -> 40 Hz Gamma Differential
    const baseFreq = 210;
    const diff = 40;

    const merger = ctx.createChannelMerger(2);

    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(baseFreq + diff, ctx.currentTime);

    // Warm background pink drone for pleasant listening
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(320, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, ctx.currentTime);

    const oscGainL = ctx.createGain();
    oscGainL.gain.setValueAtTime(0.22, ctx.currentTime);

    const oscGainR = ctx.createGain();
    oscGainR.gain.setValueAtTime(0.22, ctx.currentTime);

    oscL.connect(oscGainL);
    oscGainL.connect(merger, 0, 0);

    oscR.connect(oscGainR);
    oscGainR.connect(merger, 0, 1);

    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(merger, 0, 0);
    noiseGain.connect(merger, 0, 1);

    if (this.masterGain) {
      merger.connect(this.masterGain);
    }

    oscL.start();
    oscR.start();
    noiseSrc.start();

    this.cleanupNodes.push(() => {
      try {
        oscL.stop();
        oscR.stop();
        noiseSrc.stop();
        oscL.disconnect();
        oscR.disconnect();
        noiseSrc.disconnect();
      } catch {
        // ignore
      }
    });
  }

  private playBrownNoise(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = noiseBuffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain compensation
      }
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, ctx.currentTime);

    noiseSrc.connect(filter);
    filter.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    noiseSrc.start();

    this.cleanupNodes.push(() => {
      try {
        noiseSrc.stop();
        noiseSrc.disconnect();
      } catch {
        // ignore
      }
    });
  }

  private playRain(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.12;
      }
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(1400, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(180, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, ctx.currentTime);

    noiseSrc.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    noiseSrc.start();

    this.cleanupNodes.push(() => {
      try {
        noiseSrc.stop();
        noiseSrc.disconnect();
      } catch {
        // ignore
      }
    });
  }

  private playForestWind(ctx: AudioContext) {
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = noiseBuffer.getChannelData(ch);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.03 * white) / 1.03;
        lastOut = data[i];
        data[i] *= 2.8;
      }
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, ctx.currentTime);
    filter.Q.setValueAtTime(1.2, ctx.currentTime);

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(220, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);

    noiseSrc.connect(filter);
    filter.connect(gain);
    if (this.masterGain) {
      gain.connect(this.masterGain);
    }

    noiseSrc.start();
    lfo.start();

    this.cleanupNodes.push(() => {
      try {
        noiseSrc.stop();
        lfo.stop();
        noiseSrc.disconnect();
        lfo.disconnect();
      } catch {
        // ignore
      }
    });
  }
}

export const soundscapeEngine = new SoundscapeEngine();
