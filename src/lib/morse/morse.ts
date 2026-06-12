// Core Morse code logic: encoding tables and timing schedules.
// Timing follows the PARIS standard: dit = 1200 / WPM milliseconds,
// dah = 3 dits, intra-character gap = 1 dit, inter-character gap = 3 dits,
// inter-word gap = 7 dits. Farnsworth spacing stretches only the gaps
// between characters and words so individual characters keep their rhythm.

export const MORSE_TABLE: Record<string, string> = {
	A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
	G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
	M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
	S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
	Y: '-.--', Z: '--..',
	'0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
	'5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
	'.': '.-.-.-', ',': '--..--', '?': '..--..', '/': '-..-.',
	'=': '-...-', '+': '.-.-.', '-': '-....-', '@': '.--.-.',
	"'": '.----.', '!': '-.-.--', ':': '---...', '(': '-.--.', ')': '-.--.-',
	'"': '.-..-.', '&': '.-...'
};

export const REVERSE_TABLE: Record<string, string> = Object.fromEntries(
	Object.entries(MORSE_TABLE).map(([ch, code]) => [code, ch])
);

/** Milliseconds per dit at the given words-per-minute. */
export function ditMs(wpm: number): number {
	return 1200 / wpm;
}

/** Encode plain text into morse code notation, e.g. "SOS" -> "... --- ...". Words separated by " / ". */
export function encode(text: string): string {
	return text
		.trim()
		.toUpperCase()
		.split(/\s+/)
		.map((word) =>
			word
				.split('')
				.map((ch) => MORSE_TABLE[ch] ?? '')
				.filter(Boolean)
				.join(' ')
		)
		.filter(Boolean)
		.join(' / ');
}

/** Decode morse notation ("... --- ..." with "/" between words) back to text. */
export function decode(morse: string): string {
	return morse
		.trim()
		.split(/\s*\/\s*/)
		.map((word) =>
			word
				.split(/\s+/)
				.map((code) => REVERSE_TABLE[code] ?? (code ? '#' : ''))
				.join('')
		)
		.join(' ')
		.trim();
}

export interface ToneEvent {
	/** start time in ms from schedule start */
	start: number;
	/** tone duration in ms */
	dur: number;
	/** '.' or '-' */
	symbol: '.' | '-';
	/** index of the source character in the cleaned text */
	charIndex: number;
}

export interface ScheduledChar {
	char: string;
	code: string; // morse code, '' for word space
	/** time range this char occupies, ms */
	start: number;
	end: number;
}

export interface MorseSchedule {
	tones: ToneEvent[];
	chars: ScheduledChar[];
	/** total duration ms including trailing element gap */
	duration: number;
	/** the cleaned text actually scheduled */
	text: string;
}

export interface TimingOptions {
	wpm: number;
	/** Farnsworth effective speed; gaps are stretched when lower than wpm. Defaults to wpm. */
	effectiveWpm?: number;
}

/**
 * Build a full playback schedule for a piece of text.
 * Characters with no morse mapping are dropped; whitespace runs collapse to one word gap.
 */
export function buildSchedule(text: string, opts: TimingOptions): MorseSchedule {
	const dit = ditMs(opts.wpm);
	// Farnsworth: per ARRL, stretch inter-char and inter-word gaps so the
	// overall speed matches effectiveWpm while characters play at wpm.
	const eff = Math.min(opts.effectiveWpm ?? opts.wpm, opts.wpm);
	let charGap = 3 * dit;
	let wordGap = 7 * dit;
	if (eff < opts.wpm) {
		// Per ARRL Farnsworth method: the 19 gap units of a standard 50-unit
		// PARIS word absorb the extra time so overall speed matches effectiveWpm.
		const unit = (60000 / eff - (31.2 * 1000) / opts.wpm) / 19;
		charGap = 3 * unit;
		wordGap = 7 * unit;
	}

	const cleaned = text
		.trim()
		.toUpperCase()
		.replace(/\s+/g, ' ')
		.split('')
		.filter((ch) => ch === ' ' || MORSE_TABLE[ch])
		.join('')
		.replace(/\s+/g, ' ')
		.trim();

	const tones: ToneEvent[] = [];
	const chars: ScheduledChar[] = [];
	let t = 0;

	for (let i = 0; i < cleaned.length; i++) {
		const ch = cleaned[i];
		if (ch === ' ') {
			const start = t - charGap; // word gap replaces the char gap already added
			t = start + wordGap;
			chars.push({ char: ' ', code: '', start, end: t });
			continue;
		}
		const code = MORSE_TABLE[ch];
		const charStart = t;
		for (let s = 0; s < code.length; s++) {
			const symbol = code[s] as '.' | '-';
			const dur = symbol === '.' ? dit : 3 * dit;
			tones.push({ start: t, dur, symbol, charIndex: i });
			t += dur;
			if (s < code.length - 1) t += dit; // intra-character gap
		}
		chars.push({ char: ch, code, start: charStart, end: t });
		t += charGap; // gap after character (trimmed/replaced as needed)
	}

	// drop the trailing character gap
	if (chars.length > 0) t -= charGap;

	return { tones, chars, duration: Math.max(t, 0), text: cleaned };
}

/** Classify a key-press duration (ms) as dit or dah given the current wpm. */
export function classifyPress(durMs: number, wpm: number): '.' | '-' {
	return durMs < 2 * ditMs(wpm) ? '.' : '-';
}

/** Gap classification for the straight-key decoder. */
export function classifyGap(gapMs: number, wpm: number): 'symbol' | 'char' | 'word' {
	const dit = ditMs(wpm);
	if (gapMs < 2 * dit) return 'symbol';
	if (gapMs < 5 * dit) return 'char';
	return 'word';
}
