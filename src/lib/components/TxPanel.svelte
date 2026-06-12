<script lang="ts">
	import { buildSchedule, encode, type MorseSchedule } from '$lib/morse/morse';
	import type { CwPlayer } from '$lib/morse/audio';
	import { settings } from '$lib/settings.svelte';
	import MorseDisplay from './MorseDisplay.svelte';

	let { player }: { player: CwPlayer } = $props();

	let text = $state('HELLO WORLD');
	let schedule = $state<MorseSchedule | null>(null);
	let progressMs = $state(-1);
	let playing = $state(false);
	let raf = 0;

	const morseText = $derived(encode(text));

	function tick() {
		progressMs = player.progressMs();
		if (playing) raf = requestAnimationFrame(tick);
	}

	function play() {
		if (!text.trim()) return;
		schedule = buildSchedule(text, {
			wpm: settings.wpm,
			effectiveWpm: settings.farnsworth ? settings.effectiveWpm : settings.wpm
		});
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.onended = () => {
			cancelAnimationFrame(raf);
			playing = false;
			progressMs = schedule ? schedule.duration + 1 : -1;
		};
		player.play(schedule);
		playing = true;
		raf = requestAnimationFrame(tick);
	}

	function stop() {
		player.stop();
		playing = false;
		cancelAnimationFrame(raf);
		progressMs = -1;
	}

	$effect(() => () => {
		cancelAnimationFrame(raf);
		player.stop();
	});
</script>

<div class="tx">
	<label class="label" for="tx-message">Message</label>
	<textarea
		id="tx-message"
		bind:value={text}
		rows="2"
		maxlength="120"
		placeholder="Type a message to transmit…"
		onkeydown={(e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				playing ? stop() : play();
			}
		}}
	></textarea>

	<div class="code-preview" aria-label="morse code">{morseText || ' '}</div>

	<MorseDisplay {schedule} {progressMs} />

	<div class="actions">
		{#if playing}
			<button class="btn" onclick={stop}>■ Stop</button>
		{:else}
			<button class="btn primary" onclick={play} disabled={!text.trim()}>▶ Transmit</button>
		{/if}
	</div>
</div>

<style>
	.tx {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.code-preview {
		font-size: 0.85rem;
		letter-spacing: 0.12em;
		color: var(--ink-dim);
		padding: 0 2px;
		min-height: 1.2em;
		word-break: break-all;
	}
	.actions {
		display: flex;
		justify-content: center;
		padding-top: 4px;
	}
	.actions .btn {
		min-width: 220px;
		font-size: 0.8rem;
		padding: 15px 24px;
	}
</style>
