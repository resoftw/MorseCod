// Training material for the RX challenge, grouped by difficulty.

export const WORDS = {
	easy: [
		'SOS', 'HI', 'OK', 'CQ', 'YES', 'NO', 'AT', 'TO', 'IN', 'IT',
		'ME', 'WE', 'HE', 'BE', 'SO', 'UP', 'GO', 'AM', 'AN', 'AS',
		'EAT', 'SEE', 'SUN', 'RUN', 'TEN', 'NET', 'SET', 'SIT', 'TEA', 'ATE'
	],
	medium: [
		'CODE', 'WAVE', 'SHIP', 'WIND', 'STAR', 'MOON', 'FIRE', 'IRON', 'WIRE', 'TONE',
		'RADIO', 'SOUND', 'NIGHT', 'LIGHT', 'WATER', 'EARTH', 'STORM', 'NORTH', 'SOUTH', 'POWER',
		'HELLO', 'WORLD', 'MUSIC', 'TRAIN', 'OCEAN', 'CLOUD', 'METAL', 'SPARK', 'PILOT', 'TOWER'
	],
	hard: [
		'SIGNAL', 'MORSE', 'TELEGRAPH', 'OPERATOR', 'FREQUENCY', 'ANTENNA',
		'STATION', 'CIRCUIT', 'VOLTAGE', 'MAYDAY', 'COMPASS', 'HORIZON',
		'SATELLITE', 'TRANSMIT', 'RECEIVER', 'CAPTAIN', 'VOYAGE', 'BEACON',
		'CQ DX', '73 GM', 'QTH HR', 'R5 FB', 'DE K1A', 'HW CPY',
		'599 TU', '5NN 73', 'UR 559', '88 OM', 'QRZ?', 'GO 4 IT'
	]
} as const;

export type Difficulty = keyof typeof WORDS;

export function randomWord(level: Difficulty, exclude?: string): string {
	const pool = WORDS[level];
	let w: string;
	do {
		w = pool[Math.floor(Math.random() * pool.length)];
	} while (w === exclude && pool.length > 1);
	return w;
}
