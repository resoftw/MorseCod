<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { CwPlayer } from '$lib/morse/audio';
	import { settings } from '$lib/settings.svelte';
	import ControlRail from '$lib/components/ControlRail.svelte';

	const player = new CwPlayer();

	// ── exact PCB layout traced from the device photo ─────────────────
	// left side = dah, right side = dit; LEDs walk the tree as you tap.
	type Shape = 'c' | 'rh' | 'rv'; // circle, horizontal rect, vertical rect
	interface PNode {
		code: string;
		char: string;
		shape: Shape;
		x: number;
		y: number;
		lx: number; // label offset
		ly: number;
	}
	const N = (
		code: string,
		char: string,
		shape: Shape,
		x: number,
		y: number,
		lx: number,
		ly: number
	): PNode => ({ code, char, shape, x, y, lx, ly });

	const nodes: PNode[] = [
		// top row  O M T  ⌖  E I S H — rects on the dah side, circles on the dit side
		N('---', 'O', 'rh', 58, 60, 0, -16),
		N('--', 'M', 'rh', 104, 60, 0, -16),
		N('-', 'T', 'rh', 150, 60, 0, -16),
		N('.', 'E', 'c', 212, 60, 0, -16),
		N('..', 'I', 'c', 245, 60, 0, -16),
		N('...', 'S', 'c', 278, 60, 0, -16),
		N('....', 'H', 'c', 320, 60, 0, -16),
		// left (dah) branch
		N('--.', 'G', 'c', 104, 112, 16, 4),
		N('--.-', 'Q', 'rh', 58, 112, -2, 20),
		N('--..', 'Z', 'c', 104, 150, 16, 4),
		N('-.', 'N', 'c', 150, 205, 15, -8),
		N('-.-', 'K', 'rh', 104, 205, 0, -15),
		N('-.--', 'Y', 'rh', 58, 205, -2, -14),
		N('-.-.', 'C', 'c', 104, 247, 16, 4),
		N('-..', 'D', 'c', 150, 300, 15, -8),
		N('-..-', 'X', 'rh', 100, 300, -4, -14),
		N('-...', 'B', 'c', 150, 345, -16, 4),
		// right (dit) branch
		N('.-', 'A', 'rv', 212, 205, -12, 16),
		N('.-.', 'R', 'c', 245, 205, 2, 21),
		N('.-..', 'L', 'c', 278, 205, 16, 4),
		N('.--', 'W', 'rv', 212, 300, -13, 8),
		N('.--.', 'P', 'c', 245, 300, 16, 4),
		N('.---', 'J', 'rv', 212, 345, 14, 6),
		N('..-', 'U', 'rv', 245, 112, -13, 0),
		N('..-.', 'F', 'c', 245, 150, 15, 5),
		N('...-', 'V', 'rv', 278, 112, 14, 0)
	];
	const byCode = new Map(nodes.map((n) => [n.code, n]));

	// every edge of the tree: target code → PCB trace path.
	// The edge's symbol (last char of the code) decides its lit colour:
	// dit = green, dah = red.
	const edges: { code: string; d: string }[] = [
		// top rail, symbol by symbol
		{ code: '-', d: 'M 174 60 H 162' },
		{ code: '--', d: 'M 138 60 H 116' },
		{ code: '---', d: 'M 92 60 H 70' },
		{ code: '.', d: 'M 188 60 H 203.5' },
		{ code: '..', d: 'M 220.5 60 H 236.5' },
		{ code: '...', d: 'M 253.5 60 H 269.5' },
		{ code: '....', d: 'M 286.5 60 H 311.5' },
		// left letters
		{ code: '--.', d: 'M 104 66.5 V 103.5' },
		{ code: '--.-', d: 'M 95.5 112 H 70' },
		{ code: '--..', d: 'M 104 120.5 V 141.5' },
		{ code: '-.', d: 'M 150 66 V 196.5' },
		{ code: '-.-', d: 'M 141.5 205 H 116' },
		{ code: '-.--', d: 'M 92 205 H 70' },
		{ code: '-.-.', d: 'M 104 211.5 V 238.5' },
		{ code: '-..', d: 'M 150 213.5 V 291.5' },
		{ code: '-..-', d: 'M 141.5 300 H 112' },
		{ code: '-...', d: 'M 150 308.5 V 336.5' },
		// right letters
		{ code: '.-', d: 'M 212 68.5 V 193' },
		{ code: '.-.', d: 'M 218.5 205 H 236.5' },
		{ code: '.-..', d: 'M 253.5 205 H 269.5' },
		{ code: '.--', d: 'M 212 217 V 288' },
		{ code: '.--.', d: 'M 218.5 300 H 236.5' },
		{ code: '.---', d: 'M 212 312 V 333' },
		{ code: '..-', d: 'M 245 68.5 V 100' },
		{ code: '..-.', d: 'M 245 124 V 141.5' },
		{ code: '...-', d: 'M 278 68.5 V 100' }
	];

	// ── tap-key decoder state ──────────────────────────────────────────
	const DIT_MAX = 220; // press shorter than this = dit
	const COMMIT_MS = 800; // idle gap that commits the letter
	const WORD_MS = 2000; // longer idle appends a word space

	let buffer = $state('');
	let rx = $state('');
	let pressing = $state(false);
	let flashCode = $state('');
	let invalid = $state(false);
	let pressStart = 0;
	let commitTimer: ReturnType<typeof setTimeout> | null = null;
	let wordTimer: ReturnType<typeof setTimeout> | null = null;
	let flashTimer: ReturnType<typeof setTimeout> | null = null;

	const current = $derived(byCode.get(buffer) ?? null);
	const isValid = (code: string) => byCode.has(code);

	function clearTimers() {
		if (commitTimer) clearTimeout(commitTimer);
		if (wordTimer) clearTimeout(wordTimer);
		commitTimer = wordTimer = null;
	}

	function keyDown() {
		if (pressing) return;
		pressing = true;
		clearTimers();
		invalid = false;
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.keyDown();
		pressStart = performance.now();
	}

	function keyUp() {
		if (!pressing) return;
		pressing = false;
		player.keyUp();
		const dur = performance.now() - pressStart;
		const next = buffer + (dur < DIT_MAX ? '.' : '-');
		if (isValid(next)) {
			buffer = next;
		} else {
			buffer = '';
			invalid = true;
		}
		commitTimer = setTimeout(commit, COMMIT_MS);
	}

	function commit() {
		const node = byCode.get(buffer);
		if (node) {
			rx += node.char;
			flashCode = node.code;
			if (flashTimer) clearTimeout(flashTimer);
			flashTimer = setTimeout(() => (flashCode = ''), 650);
		}
		buffer = '';
		wordTimer = setTimeout(() => {
			if (rx && !rx.endsWith(' ')) rx += ' ';
		}, WORD_MS - COMMIT_MS);
	}

	function clearAll() {
		clearTimers();
		buffer = '';
		rx = '';
		invalid = false;
	}

	function onWindowKey(e: KeyboardEvent, isDown: boolean) {
		if (e.code !== 'Space') return;
		if (e.repeat) return;
		const tag = (e.target as HTMLElement)?.tagName;
		if (tag === 'INPUT' || tag === 'TEXTAREA') return;
		e.preventDefault();
		isDown ? keyDown() : keyUp();
	}

	function lit(code: string): boolean {
		// the path walked so far stays lit
		return buffer.length > 0 && buffer.startsWith(code);
	}

	onMount(() => () => {
		clearTimers();
		if (flashTimer) clearTimeout(flashTimer);
		if (pressing) player.keyUp();
		player.dispose();
	});
</script>

<svelte:head>
	<title>MORSECOD — Tap Key</title>
</svelte:head>

<svelte:window onkeydown={(e) => onWindowKey(e, true)} onkeyup={(e) => onWindowKey(e, false)} onblur={keyUp} />

<main class="wrap">
	<div class="topbar">
		<span class="label">MORSECOD · TAP KEY</span>
		<nav class="links">
			<a class="btn navlink" href="{base}/tree">TREE →</a>
			<a class="btn navlink" href="{base}/trainer">STATION →</a>
		</nav>
	</div>

	<div class="device">
		<div class="board">
			<span class="hole" aria-hidden="true"></span>
			<header class="silk-head">
				<span class="silk-title">MORSE</span>
				<span class="silk-title">CODE</span>
			</header>

			<svg viewBox="0 0 362 392" role="img" aria-label="morse decoder board" data-current={current?.char ?? ''}>
				<!-- dah on the left, dit on the right — matching the tree sides -->
				<g class="legend">
					<rect class="leg-dah" x="26" y="17" width="14" height="6" rx="3" />
					<text class="leg-txt" x="46" y="24">DAH − LONG</text>
					<circle class="leg-dit" cx="252" cy="20" r="4" />
					<text class="leg-txt" x="262" y="24">DIT · SHORT</text>
				</g>

				<!-- antenna -->
				<g class="ant" class:hot={pressing || buffer.length > 0}>
					<path d="M 167 26 L 195 26 L 181 48 Z" />
					<line x1="171" y1="33" x2="191" y2="33" />
					<line x1="175" y1="40" x2="187" y2="40" />
					<line x1="181" y1="48" x2="181" y2="60" />
				</g>

				<!-- traces: green when a dit was keyed, red when a dah -->
				{#each edges as e (e.code)}
					<path
						class="edge {e.code.at(-1) === '.' ? 'dit' : 'dah'}"
						class:lit={lit(e.code)}
						d={e.d}
					/>
				{/each}

				<!-- letter nodes -->
				{#each nodes as n (n.code)}
					<g class="node">
						{#if n.shape === 'c'}
							<circle
								class="led"
								class:on={lit(n.code)}
								class:flash={flashCode === n.code}
								cx={n.x}
								cy={n.y}
								r="8.5"
							/>
						{:else if n.shape === 'rh'}
							<rect
								class="led"
								class:on={lit(n.code)}
								class:flash={flashCode === n.code}
								x={n.x - 12}
								y={n.y - 6.5}
								width="24"
								height="13"
								rx="2"
							/>
						{:else}
							<rect
								class="led"
								class:on={lit(n.code)}
								class:flash={flashCode === n.code}
								x={n.x - 6.5}
								y={n.y - 12}
								width="13"
								height="24"
								rx="2"
							/>
						{/if}
						<text class="lbl" x={n.x + n.lx} y={n.y + n.ly + 4}>{n.char}</text>
					</g>
				{/each}
			</svg>

			<div class="rx">
				<span class="rx-tag">RX></span>
				<span class="rx-text">{rx || ' '}</span>
				<span class="rx-buf">
					{#each buffer.split('') as s, i (i)}
						<i class={s === '.' ? 'bd' : 'bh'}>{s === '.' ? '·' : '−'}</i>
					{/each}
				</span>
				<button class="clr" onclick={clearAll} disabled={!rx && !buffer}>CLR</button>
			</div>

			<button
				class="pad"
				class:down={pressing}
				class:bad={invalid}
				onpointerdown={(e) => {
					e.preventDefault();
					(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
					keyDown();
				}}
				onpointerup={keyUp}
				onpointercancel={keyUp}
				oncontextmenu={(e) => e.preventDefault()}
				aria-label="morse key — short press dit, long press dah"
			>
				<span class="pad-grid" aria-hidden="true"></span>
				<span class="pad-lbl">· TAP — SHORT&nbsp;=&nbsp;DIT&nbsp;&nbsp;LONG&nbsp;=&nbsp;DAH · </span>
			</button>
		</div>
	</div>

	<ControlRail />

	<footer class="label">HOLD SPACE OR TAP THE PAD — THE TREE FOLLOWS YOUR KEYING</footer>
</main>

<style>
	.wrap {
		max-width: 560px;
		margin: 0 auto;
		padding: 18px 14px calc(28px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
	}
	.links {
		display: flex;
		gap: 8px;
	}
	.navlink {
		font-size: 0.55rem;
		padding: 8px 12px;
		text-decoration: none;
		display: inline-block;
	}

	/* ── the device: aluminum frame + black PCB ── */
	.device {
		border-radius: 22px;
		padding: 7px;
		background: linear-gradient(160deg, #c8ccd2, #7d828c 40%, #b9bdc6 70%, #6f747e);
		box-shadow:
			0 16px 44px rgba(0, 0, 0, 0.65),
			inset 0 1px 1px rgba(255, 255, 255, 0.55),
			inset 0 -1px 2px rgba(0, 0, 0, 0.5);
	}
	.board {
		position: relative;
		border-radius: 16px;
		padding: 14px 12px 14px;
		background:
			radial-gradient(150% 100% at 25% 0%, rgba(255, 255, 255, 0.05), transparent 55%),
			#0b0d10;
		box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.7);
	}
	.hole {
		position: absolute;
		top: 10px;
		right: 12px;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: radial-gradient(circle, #05070a 0 36%, #d4a942 38% 80%, #93701f 82% 100%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.3);
	}
	.silk-head {
		display: flex;
		justify-content: space-between;
		padding: 4px 36px 2px 18px;
	}
	.silk-title {
		font-family: var(--display);
		font-size: 1.05rem;
		letter-spacing: 0.3em;
		color: #e8e9ea;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.legend .leg-dit {
		fill: #3ddc78;
		filter: drop-shadow(0 0 3px rgba(61, 220, 120, 0.8));
	}
	.legend .leg-dah {
		fill: #ff4530;
		filter: drop-shadow(0 0 3px rgba(255, 69, 48, 0.8));
	}
	.leg-txt {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.14em;
		fill: #8b9097;
	}

	.edge {
		fill: none;
		stroke: #b9bdc2;
		stroke-width: 2.2;
		stroke-linecap: square;
		stroke-linejoin: round;
		transition: stroke 70ms ease;
	}
	.edge.lit.dit {
		stroke: #3ddc78;
		filter: drop-shadow(0 0 3px rgba(61, 220, 120, 0.9));
	}
	.edge.lit.dah {
		stroke: #ff4530;
		filter: drop-shadow(0 0 3px rgba(255, 69, 48, 0.9));
	}
	.ant path {
		fill: none;
		stroke: #e8e9ea;
		stroke-width: 2;
	}
	.ant line {
		stroke: #e8e9ea;
		stroke-width: 1.6;
	}
	.ant.hot path,
	.ant.hot line {
		stroke: #ffd66b;
		filter: drop-shadow(0 0 3px rgba(255, 214, 107, 0.8));
	}
	.lbl {
		font-family: var(--mono);
		font-size: 15px;
		font-weight: 600;
		fill: #e8e9ea;
		text-anchor: middle;
	}
	.led {
		fill: #20251c;
		stroke: #424a3a;
		stroke-width: 1.8;
		transition: fill 60ms ease;
	}
	.led.on {
		fill: #ffd66b;
		stroke: #ffe9af;
		filter: drop-shadow(0 0 5px rgba(255, 214, 107, 0.9));
	}
	.led.flash {
		animation: ledflash 0.65s ease;
	}
	@keyframes ledflash {
		0%, 40%, 80% { fill: #ffd66b; stroke: #ffe9af; filter: drop-shadow(0 0 7px rgba(255, 214, 107, 1)); }
		20%, 60% { fill: #20251c; stroke: #424a3a; filter: none; }
	}

	/* ── RX readout ── */
	.rx {
		display: flex;
		align-items: baseline;
		gap: 9px;
		margin: 6px 4px 12px;
		padding: 9px 12px;
		border-radius: 8px;
		background: #06080b;
		border: 1px solid #1c2126;
		box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.7);
	}
	.rx-tag {
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.2em;
		color: #5c646c;
	}
	.rx-text {
		flex: 1;
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: 0.22em;
		color: #9fffc4;
		text-shadow: 0 0 9px rgba(120, 255, 170, 0.5);
		min-height: 1.2em;
		word-break: break-all;
	}
	.rx-buf {
		font-size: 1.1rem;
		letter-spacing: 0.18em;
		min-width: 3.2em;
		text-align: right;
	}
	.rx-buf i {
		font-style: normal;
	}
	.rx-buf .bd {
		color: #3ddc78;
		text-shadow: 0 0 8px rgba(61, 220, 120, 0.7);
	}
	.rx-buf .bh {
		color: #ff4530;
		text-shadow: 0 0 8px rgba(255, 69, 48, 0.7);
	}
	.clr {
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.14em;
		color: #5c646c;
		background: transparent;
		border: 1px solid #1c2126;
		border-radius: 6px;
		padding: 5px 9px;
		cursor: pointer;
	}
	.clr:hover:not(:disabled) {
		color: var(--red);
		border-color: rgba(255, 69, 48, 0.5);
	}
	.clr:disabled {
		opacity: 0.4;
		cursor: default;
	}

	/* ── the thumb pad ── */
	.pad {
		position: relative;
		width: 100%;
		height: 96px;
		border-radius: 12px;
		border: 1px solid #34302a;
		cursor: pointer;
		overflow: hidden;
		background:
			radial-gradient(110% 150% at 50% 0%, rgba(255, 214, 107, 0.12), transparent 60%),
			linear-gradient(180deg, #181510, #0e0c09);
		box-shadow:
			0 4px 0 #05060a,
			inset 0 1px 0 rgba(255, 255, 255, 0.07);
		transition: transform 40ms ease, box-shadow 40ms ease;
		touch-action: none;
		user-select: none;
		display: grid;
		place-items: center;
	}
	.pad-grid {
		position: absolute;
		inset: 8px;
		border-radius: 8px;
		background:
			repeating-linear-gradient(0deg, transparent 0 7px, rgba(212, 169, 66, 0.16) 7px 9px),
			repeating-linear-gradient(90deg, transparent 0 7px, rgba(212, 169, 66, 0.16) 7px 9px);
		border: 1px dashed rgba(212, 169, 66, 0.35);
		pointer-events: none;
	}
	.pad-lbl {
		position: relative;
		font-family: var(--display);
		font-size: 0.55rem;
		letter-spacing: 0.22em;
		color: #8d7a4a;
		pointer-events: none;
	}
	.pad.down {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #05060a, inset 0 2px 10px rgba(0, 0, 0, 0.6);
		background:
			radial-gradient(110% 150% at 50% 0%, rgba(255, 214, 107, 0.3), transparent 65%),
			linear-gradient(180deg, #221d12, #14110a);
	}
	.pad.down .pad-lbl {
		color: var(--amber);
		text-shadow: 0 0 8px var(--amber-glow);
	}
	.pad.bad {
		animation: badshake 0.25s ease;
	}
	@keyframes badshake {
		25% { transform: translateX(-4px); }
		75% { transform: translateX(4px); }
	}

	footer {
		text-align: center;
		padding-top: 4px;
	}
</style>
