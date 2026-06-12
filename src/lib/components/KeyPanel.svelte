<script lang="ts">
	import { classifyPress, ditMs, REVERSE_TABLE } from '$lib/morse/morse';
	import type { CwPlayer } from '$lib/morse/audio';
	import { settings } from '$lib/settings.svelte';

	let { player }: { player: CwPlayer } = $props();

	let down = $state(false);
	let buffer = $state(''); // symbols of the char being keyed
	let output = $state('');
	let pressStart = 0;
	let charTimer: ReturnType<typeof setTimeout> | null = null;
	let wordTimer: ReturnType<typeof setTimeout> | null = null;

	function clearTimers() {
		if (charTimer) clearTimeout(charTimer);
		if (wordTimer) clearTimeout(wordTimer);
		charTimer = wordTimer = null;
	}

	function keyDown() {
		if (down) return;
		down = true;
		clearTimers();
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.keyDown();
		pressStart = performance.now();
	}

	function keyUp() {
		if (!down) return;
		down = false;
		player.keyUp();
		const dur = performance.now() - pressStart;
		buffer += classifyPress(dur, settings.wpm);

		const dit = ditMs(settings.wpm);
		charTimer = setTimeout(() => {
			const ch = REVERSE_TABLE[buffer] ?? '·';
			output += ch;
			buffer = '';
			wordTimer = setTimeout(() => {
				if (output && !output.endsWith(' ')) output += ' ';
			}, 4 * dit);
		}, 2.5 * dit);
	}

	function onWindowKey(e: KeyboardEvent, isDown: boolean) {
		if (e.code !== 'Space' && e.key !== 'Enter') return;
		if (e.repeat) return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;
		e.preventDefault();
		isDown ? keyDown() : keyUp();
	}

	function clearAll() {
		clearTimers();
		buffer = '';
		output = '';
	}

	$effect(() => () => {
		clearTimers();
		if (down) player.keyUp();
	});

	const dit = $derived(ditMs(settings.wpm));
</script>

<svelte:window
	onkeydown={(e) => onWindowKey(e, true)}
	onkeyup={(e) => onWindowKey(e, false)}
	onblur={keyUp}
/>

<div class="keyer">
	<div class="readout">
		<div class="line">
			<span class="decoded">{output}</span><span class="pending">{buffer}</span><span
				class="cursor"
				class:on={down}>▮</span
			>
		</div>
		<button class="clear" onclick={clearAll} disabled={!output && !buffer}>CLR</button>
	</div>

	<div class="keywell">
		<button
			class="key"
			class:down
			onpointerdown={(e) => {
				e.preventDefault();
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
				keyDown();
			}}
			onpointerup={keyUp}
			onpointercancel={keyUp}
			oncontextmenu={(e) => e.preventDefault()}
			aria-label="telegraph key — press and hold"
		>
			<span class="cap"></span>
		</button>
		<div class="legend">
			<span class="label">dit &lt; {Math.round(2 * dit)}ms ≤ dah</span>
			<span class="label">hold SPACE or tap the key</span>
		</div>
	</div>
</div>

<style>
	.keyer {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.readout {
		display: flex;
		gap: 10px;
		align-items: stretch;
	}
	.line {
		flex: 1;
		min-height: 58px;
		padding: 14px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background:
			repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.25) 2px 3px),
			#0a0c07;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
		font-size: 1.3rem;
		letter-spacing: 0.15em;
		word-break: break-all;
	}
	.decoded {
		color: var(--amber);
		text-shadow: 0 0 10px var(--amber-glow);
	}
	.pending {
		color: var(--ink-dim);
		margin-left: 0.2em;
	}
	.cursor {
		color: var(--ink-faint);
		animation: blink 1.1s step-end infinite;
	}
	.cursor.on {
		color: var(--amber);
		animation: none;
	}
	.clear {
		font-family: var(--display);
		font-size: 0.55rem;
		letter-spacing: 0.15em;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--ink-dim);
		cursor: pointer;
	}
	.clear:hover:not(:disabled) {
		color: var(--red);
		border-color: rgba(255, 69, 48, 0.5);
	}
	.clear:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.keywell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 10px 0 4px;
	}
	.key {
		width: 150px;
		height: 150px;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		padding: 0;
		background: radial-gradient(circle at 50% 38%, #3a4030, #181c12 75%);
		box-shadow:
			0 10px 0 #070905,
			0 14px 30px rgba(0, 0, 0, 0.7),
			inset 0 2px 0 rgba(255, 255, 255, 0.1);
		transition: transform 40ms ease, box-shadow 40ms ease;
		touch-action: none;
		user-select: none;
		display: grid;
		place-items: center;
	}
	.key .cap {
		width: 102px;
		height: 102px;
		border-radius: 50%;
		background: radial-gradient(circle at 42% 32%, #ffd66b, #e89c00 55%, #9c6a00);
		box-shadow:
			inset 0 3px 6px rgba(255, 255, 255, 0.5),
			inset 0 -6px 12px rgba(80, 50, 0, 0.7),
			0 0 0 6px #0a0c08;
		transition: box-shadow 60ms ease;
	}
	.key.down {
		transform: translateY(8px);
		box-shadow:
			0 2px 0 #070905,
			0 4px 12px rgba(0, 0, 0, 0.7),
			inset 0 2px 0 rgba(255, 255, 255, 0.06);
	}
	.key.down .cap {
		box-shadow:
			inset 0 3px 6px rgba(255, 255, 255, 0.35),
			inset 0 -4px 10px rgba(80, 50, 0, 0.8),
			0 0 0 6px #0a0c08,
			0 0 36px var(--amber-glow);
	}
	.legend {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}
</style>
