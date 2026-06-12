<script lang="ts">
	import { onMount } from 'svelte';
	import { CwPlayer } from '$lib/morse/audio';
	import { buildSchedule, MORSE_TABLE, REVERSE_TABLE, type MorseSchedule } from '$lib/morse/morse';
	import { settings } from '$lib/settings.svelte';
	import { randomWord } from '$lib/words';
	import ControlRail from '$lib/components/ControlRail.svelte';

	const player = new CwPlayer();

	// ── dichotomic morse trie, dah branches left / dit branches right ──
	// Real trie of every code up to 5 symbols: A–Z, 0–9 and / = + ( &.
	// Codes that only exist as a path to something deeper (e.g. ---- on the
	// way to 0 and 9) become unlabeled solder pads, just like a real board.
	const DEPTH = 5;
	interface TNode {
		code: string;
		char: string | null;
		x: number;
		y: number;
		depth: number;
		parent: string | null;
	}
	const NODE_Y = (d: number) => 46 + d * 96;
	const nodes: TNode[] = [];
	{
		const codes = new Set<string>();
		for (const code of Object.values(MORSE_TABLE)) {
			if (code.length > DEPTH) continue;
			for (let i = 1; i <= code.length; i++) codes.add(code.slice(0, i));
		}
		let leaf = 0;
		const leafX = (i: number) => 28 + i * 45.2;
		const rec = (code: string, depth: number, parent: string | null): number => {
			const kids = ['-', '.'].map((s) => code + s).filter((c) => codes.has(c));
			let x: number;
			if (kids.length === 0) {
				x = leafX(leaf++);
			} else {
				const xs = kids.map((c) => rec(c, depth + 1, code));
				x = (xs[0] + xs[xs.length - 1]) / 2;
			}
			nodes.push({
				code,
				char: depth === 0 ? null : (REVERSE_TABLE[code] ?? null),
				x,
				y: NODE_Y(depth),
				depth,
				parent
			});
			return x;
		};
		rec('', 0, null);
	}
	const byCode = new Map(nodes.map((n) => [n.code, n]));
	const edges = nodes
		.filter((n) => n.parent !== null)
		.map((n) => ({ from: byCode.get(n.parent!)!, to: n }));
	const treeW = Math.max(...nodes.map((n) => n.x)) + 28;

	// ── playback state ──
	let text = $state('HELLO');
	let schedule = $state<MorseSchedule | null>(null);
	let progressMs = $state(-1);
	let playing = $state(false);
	let hidden = $state(false); // challenge mode: mask RX readout while sending
	let raf = 0;

	const trace = $derived.by(() => {
		const lit = new Set<string>();
		let current = '';
		let decoded = '';
		if (!schedule || progressMs < 0) return { lit, current, decoded };
		const t = progressMs;
		for (const c of schedule.chars) if (c.end <= t) decoded += c.char;
		let ci = -1;
		for (let i = 0; i < schedule.chars.length; i++) {
			const c = schedule.chars[i];
			if (c.char !== ' ' && c.start <= t && t < c.end + 1) ci = i;
		}
		if (ci >= 0) {
			const code = schedule.chars[ci].code;
			let n = 0;
			for (const tone of schedule.tones) if (tone.charIndex === ci && tone.start <= t) n++;
			lit.add('');
			for (let s = 1; s <= n; s++) lit.add(code.slice(0, s));
			current = code.slice(0, n);
		}
		return { lit, current, decoded };
	});

	function tick() {
		progressMs = player.progressMs();
		if (playing) raf = requestAnimationFrame(tick);
	}

	function send(msg: string) {
		const sched = buildSchedule(msg, {
			wpm: settings.wpm,
			effectiveWpm: settings.farnsworth ? settings.effectiveWpm : settings.wpm
		});
		if (sched.tones.length === 0) return;
		schedule = sched;
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.onended = () => {
			cancelAnimationFrame(raf);
			playing = false;
			progressMs = schedule ? schedule.duration + 1 : -1;
			hidden = false;
		};
		player.play(sched);
		playing = true;
		raf = requestAnimationFrame(tick);
	}

	function transmit() {
		hidden = false;
		send(text);
	}

	function challenge() {
		hidden = true;
		send(randomWord('medium'));
	}

	function stop() {
		player.stop();
		playing = false;
		hidden = false;
		cancelAnimationFrame(raf);
		progressMs = -1;
	}

	function tapNode(ch: string) {
		if (playing) return;
		hidden = false;
		text = ch;
		send(ch);
	}

	onMount(() => () => {
		cancelAnimationFrame(raf);
		player.dispose();
	});
</script>

<svelte:head>
	<title>MORSECOD — Morse Code Decoder Tree</title>
</svelte:head>

<main class="wrap">
	<div class="topbar">
		<span class="label">MORSECOD · DECODER BOARD</span>
		<span class="links">
			<a class="btn station-link" href="/">TAP KEY →</a>
			<a class="btn station-link" href="/trainer">STATION →</a>
		</span>
	</div>

	<div class="pcb">
		<span class="hole" aria-hidden="true"></span>
		<header class="silk-head">
			<span class="silk-title">MORSE</span>
			<span class="silk-title">CODE</span>
		</header>

		<svg viewBox="0 0 {treeW} 568" role="img" aria-label="morse code decoder tree">
			<!-- traces -->
			{#each edges as e (e.to.code)}
				{@const mid = e.from.y + 46}
				<path
					class="trace"
					class:hot={trace.lit.has(e.to.code)}
					d="M {e.from.x} {e.from.y + 12} V {mid} H {e.to.x} V {e.to.y - 13}"
				/>
			{/each}

			<!-- antenna at root -->
			{#each [byCode.get('')!] as root (root.code)}
				<g class="ant" class:hot={trace.lit.has('')}>
					<path d="M {root.x - 13} {root.y - 26} L {root.x + 13} {root.y - 26} L {root.x} {root.y - 6} Z" />
					<line x1={root.x} y1={root.y - 26} x2={root.x} y2={root.y - 36} />
				</g>
				<circle
					class="led"
					class:on={trace.lit.has('')}
					class:cur={trace.current === '' && trace.lit.has('')}
					cx={root.x}
					cy={root.y + 4}
					r="7"
				/>
			{/each}

			<!-- letter nodes -->
			{#each nodes.filter((n) => n.depth > 0) as n (n.code)}
				{#if n.char}
					<g
						class="node"
						role="button"
						tabindex="-1"
						onclick={() => tapNode(n.char!)}
						onkeydown={(e) => e.key === 'Enter' && tapNode(n.char!)}
					>
						<text class="lbl" class:hot={trace.lit.has(n.code)} x={n.x} y={n.y - 18}>{n.char}</text>
						<circle
							class="led"
							class:on={trace.lit.has(n.code)}
							class:cur={trace.current === n.code}
							cx={n.x}
							cy={n.y}
							r="7"
						/>
					</g>
				{:else}
					<rect class="pad" x={n.x - 6} y={n.y - 5} width="12" height="10" rx="2" />
				{/if}
			{/each}

			<!-- silkscreen footnotes -->
			<text class="silk-note" x="26" y="562">MORSECOD REV 2.7</text>
			<text class="silk-note" x={treeW - 26} y="562" text-anchor="end">─ DAH · DIT ·</text>
		</svg>

		<div class="rx">
			<span class="rx-tag">RX></span>
			<span class="rx-text">
				{#if hidden && playing}
					{'?'.repeat(trace.decoded.replace(/\s/g, '').length) || ' '}
				{:else}
					{(playing || progressMs > 0 ? trace.decoded : '') || ' '}
				{/if}
			</span>
			<span class="rx-cursor" class:blink={playing}>▮</span>
		</div>

		<div class="ctl">
			<input
				type="text"
				bind:value={text}
				maxlength="40"
				placeholder="MESSAGE"
				autocomplete="off"
				spellcheck="false"
				onkeydown={(e) => e.key === 'Enter' && !playing && transmit()}
			/>
			{#if playing}
				<button class="btn gold" onclick={stop}>■ STOP</button>
			{:else}
				<button class="btn gold" onclick={transmit} disabled={!text.trim()}>▶ SEND</button>
				<button class="btn" onclick={challenge} title="random hidden word — read it from the LEDs">? RANDOM</button>
			{/if}
		</div>
	</div>

	<ControlRail />

	<footer class="label">CAN YOU READ IT BEFORE IT FINISHES?</footer>
</main>

<style>
	.wrap {
		max-width: 760px;
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
	}
	.links {
		display: flex;
		gap: 8px;
	}
	.station-link {
		font-size: 0.6rem;
		padding: 9px 14px;
		text-decoration: none;
		display: inline-block;
	}

	/* ── the PCB card ── */
	.pcb {
		position: relative;
		border-radius: 16px;
		padding: 18px 14px 16px;
		background:
			radial-gradient(140% 90% at 30% 0%, rgba(184, 255, 207, 0.05), transparent 60%),
			linear-gradient(170deg, #11150e, #0a0d08);
		border: 1px solid #262b1f;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.06),
			inset 0 0 40px rgba(0, 0, 0, 0.5),
			0 14px 40px rgba(0, 0, 0, 0.6);
	}
	.hole {
		position: absolute;
		top: 12px;
		right: 14px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: radial-gradient(circle, #05070a 0 38%, #d4a942 40% 78%, #8a6a1f 80% 100%);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.25);
	}
	.silk-head {
		display: flex;
		justify-content: space-between;
		padding: 0 30px 6px 16px;
	}
	.silk-title {
		font-family: var(--display);
		font-size: 1rem;
		letter-spacing: 0.42em;
		color: #ddd8c8;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.trace {
		fill: none;
		stroke: #4a5240;
		stroke-width: 2.4;
		stroke-linejoin: round;
		transition: stroke 90ms ease;
	}
	.trace.hot {
		stroke: #58e389;
		filter: drop-shadow(0 0 3px rgba(88, 227, 137, 0.8));
	}
	.ant path {
		fill: none;
		stroke: #ddd8c8;
		stroke-width: 2.4;
	}
	.ant line {
		stroke: #ddd8c8;
		stroke-width: 2.4;
	}
	.ant.hot path,
	.ant.hot line {
		stroke: #58e389;
	}
	.lbl {
		font-family: var(--mono);
		font-size: 21px;
		font-weight: 600;
		fill: #ddd8c8;
		text-anchor: middle;
		transition: fill 90ms ease;
	}
	.lbl.hot {
		fill: #9fffc4;
	}
	.node {
		cursor: pointer;
	}
	.node:hover .lbl {
		fill: #ffd66b;
	}
	.led {
		fill: #232a1e;
		stroke: #3c4430;
		stroke-width: 2;
		transition: fill 70ms ease;
	}
	.led.on {
		fill: #3ddc78;
		stroke: #79ffae;
		filter: drop-shadow(0 0 6px rgba(61, 220, 120, 0.9));
	}
	.led.cur {
		fill: #ff4530;
		stroke: #ff8a78;
		filter: drop-shadow(0 0 7px rgba(255, 69, 48, 0.9));
	}
	.pad {
		fill: #d4a942;
		opacity: 0.55;
	}
	.silk-note {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		fill: #59614a;
	}

	/* ── RX readout ── */
	.rx {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin: 10px 4px 12px;
		padding: 11px 14px;
		border-radius: 8px;
		background:
			repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.3) 2px 3px),
			#060905;
		border: 1px solid #20261b;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
	}
	.rx-tag {
		font-family: var(--display);
		font-size: 0.55rem;
		letter-spacing: 0.2em;
		color: var(--ink-dim);
	}
	.rx-text {
		flex: 1;
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: 0.25em;
		color: #9fffc4;
		text-shadow: 0 0 10px rgba(120, 255, 170, 0.5);
		min-height: 1.2em;
		word-break: break-all;
	}
	.rx-cursor {
		color: var(--ink-faint);
	}
	.rx-cursor.blink {
		color: #9fffc4;
		animation: blink 0.9s step-end infinite;
	}

	.ctl {
		display: flex;
		gap: 10px;
	}
	.ctl input {
		flex: 1;
		min-width: 0;
	}
	.ctl .btn {
		white-space: nowrap;
		padding: 12px 16px;
	}
	.btn.gold {
		color: #140e00;
		background: linear-gradient(180deg, #e9c25e, #c9962b);
		border-color: #f0d486;
		box-shadow: 0 3px 0 #5d4310, inset 0 1px 0 rgba(255, 255, 255, 0.4);
	}
	.btn.gold:hover {
		color: #140e00;
		filter: brightness(1.07);
	}

	footer {
		text-align: center;
		padding-top: 4px;
	}

	@media (max-width: 560px) {
		.pcb {
			padding: 14px 8px 12px;
		}
		.ctl {
			flex-wrap: wrap;
		}
		.ctl input {
			flex-basis: 100%;
		}
		.ctl .btn {
			flex: 1;
		}
	}
</style>
