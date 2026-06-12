<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { CwPlayer } from '$lib/morse/audio';
	import Scope from '$lib/components/Scope.svelte';
	import TxPanel from '$lib/components/TxPanel.svelte';
	import RxPanel from '$lib/components/RxPanel.svelte';
	import KeyPanel from '$lib/components/KeyPanel.svelte';
	import ChartPanel from '$lib/components/ChartPanel.svelte';
	import ControlRail from '$lib/components/ControlRail.svelte';

	const player = new CwPlayer();

	type Mode = 'tx' | 'rx' | 'key' | 'code';
	const MODES: Mode[] = ['tx', 'rx', 'key', 'code'];

	function initialMode(): Mode {
		if (!browser) return 'tx';
		const m = new URLSearchParams(location.search).get('mode') as Mode | null;
		return m && MODES.includes(m) ? m : 'tx';
	}

	let mode = $state<Mode>(initialMode());
	let onAir = $state(false);

	const modes: { id: Mode; name: string; desc: string }[] = [
		{ id: 'tx', name: 'TX', desc: 'Send' },
		{ id: 'rx', name: 'RX', desc: 'Copy' },
		{ id: 'key', name: 'KEY', desc: 'Tap' },
		{ id: 'code', name: 'CODE', desc: 'Chart' }
	];

	function setMode(m: Mode) {
		player.stop();
		mode = m;
	}

	onMount(() => {
		// ON AIR lamp follows actual audio output level
		let raf = 0;
		let data: Uint8Array | null = null;
		const poll = () => {
			raf = requestAnimationFrame(poll);
			const analyser = player.getAnalyser();
			if (!analyser) {
				onAir = false;
				return;
			}
			if (!data || data.length !== analyser.fftSize) data = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
			let peak = 0;
			for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i] - 128));
			onAir = peak > 6;
		};
		poll();
		return () => {
			cancelAnimationFrame(raf);
			player.dispose();
		};
	});
</script>

<svelte:head>
	<title>MORSECOD — CW Station</title>
</svelte:head>

<main class="station">
	<header class="panel screws top">
		<div class="brand">
			<span class="dots" aria-hidden="true">
				<i class="dah"></i><i class="dah"></i><i class="dit"></i>
			</span>
			<h1>MORSECOD</h1>
			<span class="sub">CW STATION · TRAINER</span>
		</div>
		<div class="lamps">
			<span class="lamp pwr" title="power"><i></i>PWR</span>
			<span class="lamp air" class:lit={onAir} title="transmitting"><i></i>ON AIR</span>
			<a class="back" href="{base}/" title="decoder board">⌁ BOARD</a>
		</div>
	</header>

	<div class="panel screws scopebox">
		<Scope {player} />
	</div>

	<nav class="tabs" aria-label="mode">
		{#each modes as m (m.id)}
			<button class="tab" class:on={mode === m.id} onclick={() => setMode(m.id)}>
				<span class="name">{m.name}</span>
				<span class="desc">{m.desc}</span>
			</button>
		{/each}
	</nav>

	<section class="panel screws main">
		{#if mode === 'tx'}
			<TxPanel {player} />
		{:else if mode === 'rx'}
			<RxPanel {player} />
		{:else if mode === 'key'}
			<KeyPanel {player} />
		{:else}
			<ChartPanel {player} />
		{/if}
	</section>

	<ControlRail />

	<footer>
		<span>· − − · MORSECOD — works offline · install from your browser menu − · · ·</span>
	</footer>
</main>

<style>
	.station {
		max-width: 720px;
		margin: 0 auto;
		padding: 18px 14px calc(28px + env(safe-area-inset-bottom));
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 14px 18px;
	}
	.brand {
		display: flex;
		align-items: baseline;
		gap: 10px;
		flex-wrap: wrap;
	}
	.dots {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transform: translateY(-2px);
	}
	.dots i {
		display: inline-block;
		height: 5px;
		border-radius: 3px;
		background: var(--amber);
		box-shadow: 0 0 8px var(--amber-glow);
	}
	.dots .dit { width: 5px; }
	.dots .dah { width: 14px; }
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 1.15rem;
		letter-spacing: 0.3em;
		color: var(--ink);
		font-weight: 400;
	}
	.sub {
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.28em;
		color: var(--ink-dim);
	}
	.lamps {
		display: flex;
		gap: 14px;
	}
	.lamp {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.18em;
		color: var(--ink-dim);
	}
	.lamp i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #2a2f24;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.8);
	}
	.lamp.pwr i {
		background: var(--phosphor);
		box-shadow: 0 0 10px rgba(184, 255, 207, 0.7);
		animation: blink 4s ease infinite;
	}
	.lamp.air.lit {
		color: var(--red);
	}
	.lamp.air.lit i {
		background: var(--red);
		box-shadow: 0 0 12px rgba(255, 69, 48, 0.8);
	}
	.back {
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.18em;
		color: var(--ink-dim);
		text-decoration: none;
		border: 1px solid var(--line);
		border-radius: 6px;
		padding: 6px 9px;
		align-self: center;
	}
	.back:hover {
		color: var(--amber);
		border-color: var(--amber-dim);
	}

	.scopebox {
		padding: 10px;
	}

	.tabs {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}
	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 11px 6px 9px;
		border-radius: 9px;
		border: 1px solid var(--line);
		background: linear-gradient(180deg, #1c2114, #14170f);
		cursor: pointer;
		box-shadow: 0 3px 0 #0a0c08, inset 0 1px 0 rgba(255, 255, 255, 0.06);
		transition: border-color 120ms ease, transform 60ms ease, box-shadow 60ms ease;
	}
	.tab:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 #0a0c08;
	}
	.tab .name {
		font-family: var(--display);
		font-size: 0.78rem;
		letter-spacing: 0.2em;
		color: var(--ink-dim);
	}
	.tab .desc {
		font-size: 0.58rem;
		letter-spacing: 0.14em;
		color: var(--ink-faint);
		text-transform: uppercase;
	}
	.tab.on {
		border-color: var(--amber-dim);
		background: linear-gradient(180deg, #2a2410, #1a160a);
		box-shadow: 0 3px 0 #0a0c08, 0 0 16px rgba(255, 176, 0, 0.12),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}
	.tab.on .name {
		color: var(--amber);
		text-shadow: 0 0 10px var(--amber-glow);
	}
	.tab.on .desc {
		color: var(--amber-dim);
	}

	.main {
		min-height: 280px;
	}

	footer {
		text-align: center;
		color: var(--ink-faint);
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		padding-top: 6px;
	}
</style>
