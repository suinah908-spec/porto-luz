// Sound, all synthesized with WebAudio — no audio files, nothing fetched:
// engine hum, sirens, gunshots, horns, and three radio stations of looping chiptune.
import { RADIO } from './config.js';

function midiToFreq(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let radioTimer = null;
  let muted = false;
  let station = 0;
  let step = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      startRadio();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, duration, type, volume, when = 0) {
    if (!ctx || !master) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  function noiseBurst(duration, volume) {
    if (!ctx || !master) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = volume || 0.3;
    src.connect(gain);
    gain.connect(master);
    src.start();
  }

  function startRadio() {
    if (radioTimer || !ctx) return;
    const tick = () => {
      if (!ctx) return;
      const stationData = RADIO[station];
      const stepSeconds = 60 / stationData.tempo / 2;
      const bass = stationData.bass[step % stationData.bass.length];
      const lead = stationData.lead[step % stationData.lead.length];
      blip(midiToFreq(bass), stepSeconds * 0.9, 'triangle', 0.12);
      if (step % 2 === 0) blip(midiToFreq(lead), stepSeconds * 0.8, 'square', 0.05);
      step += 1;
      radioTimer = window.setTimeout(tick, stepSeconds * 1000);
    };
    tick();
  }

  return {
    /** Call from a user gesture (the Start button): browsers need one. */
    unlock() { ensure(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    nextStation() {
      station = (station + 1) % RADIO.length;
      return RADIO[station].name;
    },
    stationName() { return RADIO[station].name; },
    /** Engine pitch follows speed (0..1). Silent on foot. */
    setEngine(speed01, driving) {
      if (!ctx || !engineOsc || !engineGain) return;
      engineOsc.frequency.value = 50 + speed01 * 130;
      engineGain.gain.value = driving ? 0.05 + speed01 * 0.06 : 0;
    },
    /** Two-tone siren blip while police are near. */
    sirenTick(high) {
      if (!ctx) return;
      blip(high ? 880 : 660, 0.28, 'sine', 0.05);
    },
    gunshot() { noiseBurst(0.14, 0.35); blip(160, 0.1, 'square', 0.2); },
    punch() { noiseBurst(0.08, 0.2); },
    horn() { if (ctx) { blip(370, 0.35, 'square', 0.1); blip(466, 0.35, 'square', 0.08); } },
    pickup() { blip(660, 0.1, 'sine', 0.15); blip(990, 0.16, 'sine', 0.15, 0.09); },
    missionComplete() {
      blip(523, 0.14, 'triangle', 0.2);
      blip(659, 0.14, 'triangle', 0.2, 0.12);
      blip(784, 0.3, 'triangle', 0.22, 0.24);
    },
    busted() { blip(220, 0.4, 'sawtooth', 0.2); blip(165, 0.6, 'sawtooth', 0.2, 0.3); },
  };
}
