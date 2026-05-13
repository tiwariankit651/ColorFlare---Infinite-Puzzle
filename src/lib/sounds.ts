import { MusicStyle } from '../types';

class SoundService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private musicEnabled: boolean = true;
  private currentStyle: MusicStyle = 'calm';
  private volume: number = 0.5;
  
  private musicNodes: AudioNode[] = [];
  private loopTimeout: any = null;

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
    // For simplicity, stop and restart or wait for next note
    // In a more complex setup, we'd have a master gain node
    if (this.musicEnabled) {
      this.stopMusic();
      this.startMusic();
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
  }

  private initCtx() {
    // This is no longer called automatically to avoid warnings
  }

  private stopMusic() {
    if (this.loopTimeout) {
      clearTimeout(this.loopTimeout);
      this.loopTimeout = null;
    }
    this.musicNodes.forEach(node => {
      try {
        if (node instanceof OscillatorNode) node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.musicNodes = [];
  }

  private startMusic() {
    if (!this.musicEnabled || this.currentStyle === 'none') return;
    
    // Strictly wait for the context to be ready via a user gesture (resume method)
    if (!this.ctx || this.ctx.state !== 'running') return;

    this.stopMusic(); // Ensure clean start
    // ... rest of logic

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
    }
  }

  private playUpbeat() {
    const notes = [261.63, 329.63, 392.00, 523.25]; // C Major Chord
    const playNote = () => {
      if (!this.ctx || this.currentStyle !== 'upbeat') return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.02 * (this.volume / 0.5), this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
      this.musicNodes.push(osc, gain);
      
      this.loopTimeout = setTimeout(playNote, 250);
    };
    playNote();
  }

  private playZen() {
    const notes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 Pentatonic
    const playNote = () => {
      if (!this.ctx || this.currentStyle !== 'calm') return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)] * 0.5;
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05 * (this.volume / 0.5), this.ctx.currentTime + 2);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 8);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 8);
      this.musicNodes.push(osc, gain);
      
      this.loopTimeout = setTimeout(playNote, 3000 + Math.random() * 4000);
    };
    playNote();
  }

  private playLofi() {
    const notes = [130.81, 146.83, 164.81, 196.00, 220.00]; // C3 Pentatonic
    const playNote = () => {
      if (!this.ctx || this.currentStyle !== 'lofi') return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04 * (this.volume / 0.5), this.ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 4);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 4);
      this.musicNodes.push(osc, gain, filter);
      
      this.loopTimeout = setTimeout(playNote, 2000);
    };
    playNote();
  }

  private playSpace() {
    const playDrone = () => {
      if (!this.ctx || this.currentStyle !== 'retro') return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 55 + Math.random() * 2; // Low A drone
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03 * (this.volume / 0.5), this.ctx.currentTime + 5);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 15);
      this.musicNodes.push(osc, gain);
      
      this.loopTimeout = setTimeout(playDrone, 10000);
    };
    playDrone();
  }

  private playNature() {
    const playRain = () => {
      if (!this.ctx || !this.ctx.createBufferSource || this.currentStyle !== 'nature') return;
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
      filter.frequency.setTargetAtTime(1000, this.ctx.currentTime, 0.5);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01 * (this.volume / 0.5), this.ctx.currentTime);
      
      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start();
      this.musicNodes.push(whiteNoise, filter, gain);
    };
    playRain();
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

  playComplete() {
    if (!this.enabled) return;
    this.resume();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((f, i) => this.beep(f, 0.3, 'sine', 0.1, i * 0.1));
  }

  private beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.2, delay = 0) {
    if (!this.ctx) return;
    
    // If suspended, don't return, but we won't hear this specific beep until resumed.
    // The resume() call triggered by user gesture will handle future sounds.
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0, this.ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(volume * (this.volume / 0.5), this.ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      // Silence context errors
    }
  }
}

export const sounds = new SoundService();
