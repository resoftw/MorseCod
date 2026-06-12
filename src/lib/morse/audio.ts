// Realistic CW audio engine built on WebAudio.
// A single sine oscillator runs continuously; keying is done by shaping the
// gain envelope with ~5ms raised-cosine edges, which is how a real rig keys
// its sidetone and what prevents key clicks.

import type { MorseSchedule, ToneEvent } from './morse';

const RISE = 0.005; // 5ms edge, typical of a clean CW transmitter

function raisedCosineCurve(from: number, to: number, steps = 16): Float32Array {
	const curve = new Float32Array(steps);
	for (let i = 0; i < steps; i++) {
		const x = i / (steps - 1);
		curve[i] = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * x));
	}
	return curve;
}

export class CwPlayer {
	private ctx: AudioContext | null = null;
	private osc: OscillatorNode | null = null;
	private gain: GainNode | null = null;
	private master: GainNode | null = null;
	private analyser: AnalyserNode | null = null;

	frequency = 650;
	volume = 0.6;

	private playStart = 0; // ctx time when current schedule began
	private schedule: MorseSchedule | null = null;
	private stopTimer: ReturnType<typeof setTimeout> | null = null;
	onended: (() => void) | null = null;

	private ensureCtx(): AudioContext {
		if (!this.ctx) {
			this.ctx = new AudioContext();
			this.osc = this.ctx.createOscillator();
			this.osc.type = 'sine';
			this.gain = this.ctx.createGain();
			this.gain.gain.value = 0;
			this.master = this.ctx.createGain();
			this.analyser = this.ctx.createAnalyser();
			this.analyser.fftSize = 512;
			this.osc.connect(this.gain);
			this.gain.connect(this.master);
			this.master.connect(this.analyser);
			this.analyser.connect(this.ctx.destination);
			this.osc.start();
		}
		this.osc!.frequency.value = this.frequency;
		this.master!.gain.value = this.volume;
		if (this.ctx.state === 'suspended') void this.ctx.resume();
		return this.ctx;
	}

	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	/** Schedule and play a full morse timeline. Returns the AudioContext start time. */
	play(schedule: MorseSchedule): void {
		const ctx = this.ensureCtx();
		this.stop();
		const t0 = ctx.currentTime + 0.08;
		this.playStart = t0;
		this.schedule = schedule;
		const g = this.gain!.gain;
		g.cancelScheduledValues(0);
		g.setValueAtTime(0, ctx.currentTime);
		for (const tone of schedule.tones) {
			this.keyTone(tone, t0);
		}
		this.stopTimer = setTimeout(
			() => {
				this.schedule = null;
				this.onended?.();
			},
			schedule.duration + 200
		);
	}

	private keyTone(tone: ToneEvent, t0: number): void {
		const g = this.gain!.gain;
		const start = t0 + tone.start / 1000;
		const end = start + tone.dur / 1000;
		g.setValueCurveAtTime(raisedCosineCurve(0, 1), start, RISE);
		g.setValueAtTime(1, end - RISE / 2);
		g.setValueCurveAtTime(raisedCosineCurve(1, 0), end, RISE);
	}

	/** Progress through the current schedule in ms, or -1 when idle. */
	progressMs(): number {
		if (!this.ctx || !this.schedule) return -1;
		return (this.ctx.currentTime - this.playStart) * 1000;
	}

	get playing(): boolean {
		return this.schedule !== null;
	}

	stop(): void {
		if (this.stopTimer) {
			clearTimeout(this.stopTimer);
			this.stopTimer = null;
		}
		this.schedule = null;
		if (this.ctx && this.gain) {
			const g = this.gain.gain;
			g.cancelScheduledValues(0);
			g.setTargetAtTime(0, this.ctx.currentTime, 0.005);
		}
	}

	/** Straight-key sidetone: call keyDown/keyUp from pointer or keyboard events. */
	keyDown(): void {
		const ctx = this.ensureCtx();
		const g = this.gain!.gain;
		g.cancelScheduledValues(0);
		g.setValueCurveAtTime(raisedCosineCurve(g.value, 1), ctx.currentTime, RISE);
	}

	keyUp(): void {
		if (!this.ctx || !this.gain) return;
		const g = this.gain.gain;
		g.cancelScheduledValues(0);
		g.setValueCurveAtTime(raisedCosineCurve(1, 0), this.ctx.currentTime, RISE);
	}

	dispose(): void {
		this.stop();
		this.osc?.stop();
		void this.ctx?.close();
		this.ctx = null;
		this.osc = null;
		this.gain = null;
		this.master = null;
		this.analyser = null;
	}
}
