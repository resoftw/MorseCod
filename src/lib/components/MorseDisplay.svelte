<script lang="ts">
	import type { MorseSchedule } from '$lib/morse/morse';

	let {
		schedule,
		progressMs = -1,
		masked = false
	}: {
		schedule: MorseSchedule | null;
		/** current playback position in ms; -1 when idle */
		progressMs?: number;
		/** hide the plain-text letters (RX challenge mode) */
		masked?: boolean;
	} = $props();

	const activeToneIdx = $derived(
		schedule && progressMs >= 0
			? schedule.tones.findIndex((t) => progressMs >= t.start && progressMs < t.start + t.dur)
			: -1
	);

	const activeCharIdx = $derived(
		schedule && progressMs >= 0
			? schedule.chars.findIndex(
					(c) => c.char !== ' ' && progressMs >= c.start && progressMs < c.end
				)
			: -1
	);

	// tones grouped per char position for rendering
	const groups = $derived(
		schedule
			? schedule.chars.map((c, i) => ({
					...c,
					idx: i,
					tones: schedule.tones
						.map((t, ti) => ({ ...t, ti }))
						.filter((t) => t.charIndex === i)
				}))
			: []
	);
</script>

<div class="display" class:empty={!schedule}>
	{#if schedule}
		{#each groups as g (g.idx)}
			{#if g.char === ' '}
				<span class="wordgap" aria-hidden="true"></span>
			{:else}
				<span class="cell" class:active={g.idx === activeCharIdx} class:done={progressMs >= g.end}>
					<span class="char">{masked ? '?' : g.char}</span>
					<span class="code">
						{#each g.tones as t (t.ti)}
							<span
								class="sym {t.symbol === '.' ? 'dit' : 'dah'}"
								class:lit={t.ti === activeToneIdx}
								class:played={progressMs >= t.start + t.dur}
							></span>
						{/each}
					</span>
				</span>
			{/if}
		{/each}
	{:else}
		<span class="placeholder">— · · · STANDBY · · · —</span>
	{/if}
</div>

<style>
	.display {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 10px 8px;
		min-height: 86px;
		padding: 16px 14px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background:
			repeating-linear-gradient(0deg, transparent 0 2px, rgba(0, 0, 0, 0.25) 2px 3px),
			#0a0c07;
		box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
	}
	.display.empty {
		align-items: center;
		justify-content: center;
	}
	.placeholder {
		color: var(--ink-faint);
		font-size: 0.8rem;
		letter-spacing: 0.25em;
	}
	.cell {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 4px 5px;
		border-radius: 6px;
		transition: background 80ms ease;
	}
	.cell.active {
		background: rgba(255, 176, 0, 0.1);
	}
	.char {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--ink-dim);
		line-height: 1;
		transition: color 80ms ease, text-shadow 80ms ease;
	}
	.cell.active .char {
		color: var(--amber);
		text-shadow: 0 0 12px var(--amber-glow);
	}
	.cell.done .char {
		color: var(--ink);
	}
	.code {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 8px;
	}
	.sym {
		display: inline-block;
		height: 6px;
		border-radius: 3px;
		background: var(--ink-faint);
		transition: background 50ms ease, box-shadow 50ms ease;
	}
	.dit {
		width: 6px;
	}
	.dah {
		width: 18px;
	}
	.sym.played {
		background: var(--amber-dim);
	}
	.sym.lit {
		background: var(--amber);
		box-shadow: 0 0 10px var(--amber-glow), 0 0 3px var(--amber);
	}
	.wordgap {
		width: 18px;
	}
</style>
