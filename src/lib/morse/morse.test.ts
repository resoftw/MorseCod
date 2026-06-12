import { describe, it, expect } from 'vitest';
import {
	encode,
	decode,
	ditMs,
	buildSchedule,
	classifyPress,
	classifyGap
} from './morse';

describe('encode', () => {
	it('encodes SOS', () => {
		expect(encode('SOS')).toBe('... --- ...');
	});

	it('is case-insensitive and separates words with /', () => {
		expect(encode('cq dx')).toBe('-.-. --.- / -.. -..-');
	});

	it('drops unmappable characters', () => {
		expect(encode('a~b')).toBe('.- -...');
	});

	it('handles numbers and punctuation', () => {
		expect(encode('73!')).toBe('--... ...-- -.-.--');
	});
});

describe('decode', () => {
	it('round-trips a sentence', () => {
		expect(decode(encode('HELLO WORLD 123'))).toBe('HELLO WORLD 123');
	});

	it('marks unknown sequences with #', () => {
		expect(decode('......-.-.-.-.-')).toBe('#');
	});
});

describe('timing', () => {
	it('dit is 60ms at 20 wpm', () => {
		expect(ditMs(20)).toBeCloseTo(60);
	});

	it('schedules E as a single dit', () => {
		const s = buildSchedule('E', { wpm: 20 });
		expect(s.tones).toHaveLength(1);
		expect(s.tones[0]).toMatchObject({ start: 0, dur: 60, symbol: '.' });
		expect(s.duration).toBeCloseTo(60);
	});

	it('schedules A with intra-character gap', () => {
		const s = buildSchedule('A', { wpm: 20 });
		// dit(60) + gap(60) + dah(180) = 300
		expect(s.tones.map((t) => [t.start, t.dur])).toEqual([
			[0, 60],
			[120, 180]
		]);
		expect(s.duration).toBeCloseTo(300);
	});

	it('uses 3-dit gap between characters and 7-dit gap between words', () => {
		const s = buildSchedule('EE E', { wpm: 20 });
		// E(60) +3dit(180)+ E(60) +7dit(420)+ E(60)
		expect(s.tones.map((t) => t.start)).toEqual([0, 240, 720]);
		expect(s.duration).toBeCloseTo(780);
	});

	it('PARIS at 20 wpm takes exactly 3 seconds including word gap', () => {
		const s = buildSchedule('PARIS', { wpm: 20 });
		// standard word = 50 units; "PARIS" content = 43 units (without final word gap)
		expect(s.duration + 7 * ditMs(20)).toBeCloseTo(3000);
	});

	it('Farnsworth stretches gaps but not characters', () => {
		const std = buildSchedule('AB', { wpm: 20 });
		const fw = buildSchedule('AB', { wpm: 20, effectiveWpm: 10 });
		// tone durations identical
		expect(fw.tones.map((t) => t.dur)).toEqual(std.tones.map((t) => t.dur));
		// but overall duration longer
		expect(fw.duration).toBeGreaterThan(std.duration);
	});

	it('tracks char indices for visual sync', () => {
		const s = buildSchedule('AB', { wpm: 20 });
		expect(s.tones[0].charIndex).toBe(0);
		expect(s.tones[2].charIndex).toBe(1);
		expect(s.chars.map((c) => c.char)).toEqual(['A', 'B']);
	});
});

describe('straight-key classification', () => {
	it('classifies short press as dit, long as dah (20 wpm, dit=60ms)', () => {
		expect(classifyPress(50, 20)).toBe('.');
		expect(classifyPress(100, 20)).toBe('.');
		expect(classifyPress(130, 20)).toBe('-');
		expect(classifyPress(200, 20)).toBe('-');
	});

	it('classifies gaps', () => {
		expect(classifyGap(60, 20)).toBe('symbol');
		expect(classifyGap(200, 20)).toBe('char');
		expect(classifyGap(400, 20)).toBe('word');
	});
});
