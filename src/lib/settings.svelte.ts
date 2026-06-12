import { browser } from '$app/environment';

const KEY = 'morsecod-settings-v1';

interface Settings {
	wpm: number;
	effectiveWpm: number;
	farnsworth: boolean;
	frequency: number;
	volume: number;
	hiScore: number;
}

const defaults: Settings = {
	wpm: 18,
	effectiveWpm: 10,
	farnsworth: false,
	frequency: 650,
	volume: 0.6,
	hiScore: 0
};

function load(): Settings {
	if (!browser) return { ...defaults };
	try {
		return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
	} catch {
		return { ...defaults };
	}
}

export const settings = $state<Settings>(load());

export function persistSettings(): void {
	if (browser) localStorage.setItem(KEY, JSON.stringify(settings));
}
