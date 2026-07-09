import { MusicStyle } from '../types';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private musicEnabled: boolean = true;
  private currentStyle: MusicStyle = 'calm';
  private volume: number = 0.5;
  
  private musicNodes: AudioNode[] = [];
  private loopTimeout: any = null;
  private isDocumentVisible: boolean = typeof document !== 'undefined' ? !document.hidden : true;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('pagehide', this.handleVisibilityChange);
      window.addEventListener('beforeunload', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    
    const isHidden = document.hidden;
    if (isHidden) {
      this.isDocumentVisible = false;
      this.stopMusic();
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } else {
      this.isDocumentVisible = true;
      if (this.ctx) {
        this.ctx.resume().then(() => {
          if (this.musicEnabled) {
            this.startMusic();
          }
        }).catch(() => {});
      }
    }
  };

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (enabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  setMusicStyle(style: MusicStyle) {
    if (this.currentStyle === style) return;
    this.currentStyle = style;
    if (this.musicEnabled) {
      this.stopMusic();
      this.startMusic();
    }
  }

  public resume() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.musicGain.connect(this.masterGain);
    }
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.musicEnabled && this.musicNodes.length === 0) {
          this.startMusic();
        }
      }).catch(e => {
        // Silent catch for autoplay policy
      });
    } else if (this.musicEnabled && this.musicNodes.length === 0) {
      this.startMusic();
    }

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  private initCtx() {
    // This is no longer called automatically to avoid warnings
  }

  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  private stopMusic() {
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.musicNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode) node.stop();
        if (node instanceof AudioBufferSourceNode) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.musicNodes = [];
  }

  private startMusic() {
    if (!this.musicEnabled || this.currentStyle === 'none' || !this.isDocumentVisible) return;
    
    // Strictly wait for the context to be ready via a user gesture (resume method)
    if (!this.ctx || this.ctx.state !== 'running') return;

    this.stopMusic(); // Ensure clean start

    switch (this.currentStyle) {
      case 'calm':
        this.playZen();
        break;
      case 'upbeat':
        this.playUpbeat();
        break;
      case 'lofi':
        this.playLofi();
        break;
      case 'nature':
        this.playNature();
        break;
      case 'retro':
        this.playSpace();
        break;
      case 'jazz':
        this.playJazz();
        break;
      case 'ambient':
        this.playAmbient();
        break;
      case 'deep':
        this.playDeep();
        break;
      case 'pulse':
        this.playPulse();
        break;
      case 'ethereal':
        this.playEthereal();
        break;
    }
  }

  private playJazz() {
    const notes = [174.61, 207.65, 233.08, 261.63, 311.13]; // F3 Blues Scale
    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'jazz' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.2);
      this.musicNodes.push(osc, gain);
      this.loopTimeout = setTimeout(playNote, 600 + Math.random() * 800);
    };
    playNote();
  }

  private playAmbient() {
    const playWave = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'ambient' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 80 + Math.random() * 40;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 6);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 12);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 12);
      this.musicNodes.push(osc, gain);
      this.loopTimeout = setTimeout(playWave, 8000);
    };
    playWave();
  }

  private playDeep() {
    const playDrone = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'deep' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 40 + Math.random() * 2;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 4);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 8);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 8);
      this.musicNodes.push(osc, gain, filter);
      this.loopTimeout = setTimeout(playDrone, 6000);
    };
    playDrone();
  }

  private playPulse() {
    const playBeep = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'pulse' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 220;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
      this.musicNodes.push(osc, gain);
      this.loopTimeout = setTimeout(playBeep, 250);
    };
    playBeep();
  }

  private playEthereal() {
    const notes = [440, 493.88, 554.37, 659.25, 739.99]; // A Major Pentatonic
    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'ethereal' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const reverb = this.ctx.createConvolver(); // Mock reverb with delay actually
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.8;
      const feedback = this.ctx.createGain();
      feedback.gain.value = 0.5;

      osc.type = 'sine';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 10);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.musicGain);

      osc.start();
      osc.stop(this.ctx.currentTime + 10);
      this.musicNodes.push(osc, gain, delay, feedback);
      this.loopTimeout = setTimeout(playNote, 3000 + Math.random() * 3000);
    };
    playNote();
  }

  private playUpbeat() {
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4 Major Chord
    let step = 0;
    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'upbeat' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      
      const freq = notes[step % notes.length] * (step % 3 === 0 ? 1.5 : 1.0);
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
      this.musicNodes.push(osc, gain);
      
      step++;
      this.loopTimeout = setTimeout(playNote, 250); // Faster rhythm
    };
    playNote();
  }

  private playZen() {
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4 Pentatonic + C5
    const playNote = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'calm' || !this.isDocumentVisible || !this.musicEnabled) return;
      
      const oscillator = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const delay = this.ctx.createDelay();
      const feedback = this.ctx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 10);
      
      delay.delayTime.value = 0.5;
      feedback.gain.value = 0.4;
      
      oscillator.connect(gain);
      gain.connect(this.musicGain);
      
      // Delay effect for "soothing" feel
      gain.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(this.musicGain);

      oscillator.start();
      oscillator.stop(this.ctx.currentTime + 12);
      
      this.musicNodes.push(oscillator, gain, delay, feedback);
      this.loopTimeout = setTimeout(playNote, 4000 + Math.random() * 4000);
    };
    playNote();
  }

  private playLofi() {
    const notes = [130.81, 146.83, 164.81, 196.00, 220.00]; // C3 Pentatonic
    let beatStep = 0;

    const playStep = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'lofi' || !this.isDocumentVisible || !this.musicEnabled) return;
      
      // Kick drum
      if (beatStep % 4 === 0 || beatStep % 4 === 2) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
        kickOsc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);
        kickGain.gain.setValueAtTime(0.06, this.ctx.currentTime);
        kickGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);
        kickOsc.start();
        kickOsc.stop(this.ctx.currentTime + 0.2);
        this.musicNodes.push(kickOsc, kickGain);
      }

      // Melody
      if (beatStep % 4 === 0 || beatStep % 4 === 3) {
        const melOsc = this.ctx.createOscillator();
        const melGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        melOsc.type = 'triangle';
        melOsc.frequency.value = notes[Math.floor(Math.random() * notes.length)] * 2;
        filter.type = 'lowpass';
        filter.frequency.value = 600; // Warm lowpass
        
        melGain.gain.setValueAtTime(0, this.ctx.currentTime);
        melGain.gain.linearRampToValueAtTime(0.03, this.ctx.currentTime + 0.3);
        melGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.6);
        
        melOsc.connect(filter);
        filter.connect(melGain);
        melGain.connect(this.musicGain);
        melOsc.start();
        melOsc.stop(this.ctx.currentTime + 1.6);
        this.musicNodes.push(melOsc, melGain, filter);
      }

      beatStep++;
      this.loopTimeout = setTimeout(playStep, 600); // 100 BPM
    };
    playStep();
  }

  private playSpace() {
    const retroNotes = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63]; // Retro Scale
    let noteIndex = 0;
    const playRetroTune = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'retro' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'square'; // Nostalgic 8-bit square wave
      const baseFreq = retroNotes[noteIndex % retroNotes.length];
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      
      if (noteIndex % 4 === 0) {
        osc.frequency.setValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.08);
      }
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
      this.musicNodes.push(osc, gain);
      
      noteIndex++;
      this.loopTimeout = setTimeout(playRetroTune, 180);
    };
    playRetroTune();
  }

  private playNature() {
    const playRain = () => {
      if (!this.ctx || !this.musicGain || !this.ctx.createBufferSource || this.currentStyle !== 'nature' || !this.isDocumentVisible || !this.musicEnabled) return;
      const bufferSize = 2 * this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      whiteNoise.loop = true;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setTargetAtTime(800, this.ctx.currentTime, 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.008, this.ctx.currentTime);
      
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      whiteNoise.start();
      this.musicNodes.push(whiteNoise, filter, gain);
    };

    const playWaterChirp = () => {
      if (!this.ctx || !this.musicGain || this.currentStyle !== 'nature' || !this.isDocumentVisible || !this.musicEnabled) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      
      const isDroplet = Math.random() < 0.5;
      if (isDroplet) {
        // Drop frequency sweep
        osc.frequency.setValueAtTime(900, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1700, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.025, this.ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      } else {
        // High bird chirp sweep
        osc.frequency.setValueAtTime(2400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(3100, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      }
      
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
      this.musicNodes.push(osc, gain);
      
      this.loopTimeout = setTimeout(playWaterChirp, 1500 + Math.random() * 2500);
    };

    playRain();
    playWaterChirp();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  playClick() {
    if (!this.enabled) return;
    this.resume();
    this.beep(440, 0.05, 'triangle', 0.1);
  }

  playConnect() {
    if (!this.enabled) return;
    this.resume();
    this.beep(880, 0.1, 'sine', 0.1);
  }

  playCombo(count: number) {
    if (!this.enabled) return;
    this.resume();
    const baseFreq = 440;
    const freq = baseFreq * Math.pow(1.05946, count); // Increase semitones
    this.beep(freq, 0.15, 'sine', 0.1 + (count * 0.01));
    if (count > 3) {
      this.beep(freq * 1.5, 0.1, 'sine', 0.05, 0.05);
    }
  }

  playComplete() {
    if (!this.enabled) return;
    this.resume();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((f, i) => this.beep(f, 0.3, 'sine', 0.1, i * 0.1));
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, delay = 0) {
    if (!this.ctx || !this.masterGain || !this.isDocumentVisible) return;
    
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume, this.ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      // Silence context errors
    }
  }
}

export const sounds = new SoundService();
