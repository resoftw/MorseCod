<script lang="ts">
	import { MORSE_TABLE, buildSchedule } from '$lib/morse/morse';
	import type { CwPlayer } from '$lib/morse/audio';
	import { settings } from '$lib/settings.svelte';

	let { player }: { player: CwPlayer } = $props();

	let active = $state('');

	const letters = Object.entries(MORSE_TABLE).filter(([ch]) => /[A-Z]/.test(ch));
	const digits = Object.entries(MORSE_TABLE).filter(([ch]) => /[0-9]/.test(ch));
	const marks = Object.entries(MORSE_TABLE).filter(([ch]) => !/[A-Z0-9]/.test(ch));

	function hear(ch: string) {
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.onended = () => {
			if (active === ch) active = '';
		};
		player.play(buildSchedule(ch, { wpm: settings.wpm }));
		active = ch;
	}
</script>

<div class="chart">
	{#each [letters, digits, marks] as group, gi (gi)}
		<div class="grid">
			{#each group as [ch, code] (ch)}
				<button class="cell" class:active={active === ch} onclick={() => hear(ch)}>
					<span class="ch">{ch}</span>
					<span class="cd">
						{#each code.split('') as sym, si (si)}
							<i class={sym === '.' ? 'dit' : 'dah'}></i>
						{/each}
					</span>
				</button>
			{/each}
		</div>
	{/each}
	<p class="hint">Tap a character to hear it at {settings.wpm} WPM</p>
</div>

<style>
	.chart {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
		gap: 7px;
	}
	.cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		padding: 10px 4px 9px;
		border-radius: 7px;
		border: 1px solid var(--line);
		background: linear-gradient(180deg, #1c2114, #14170f);
		cursor: pointer;
		transition: border-color 100ms ease, box-shadow 100ms ease;
	}
	.cell:hover {
		border-color: var(--amber-dim);
	}
	.cell.active {
		border-color: var(--amber);
		box-shadow: 0 0 14px rgba(255, 176, 0, 0.2), inset 0 0 10px rgba(255, 176, 0, 0.08);
	}
	.ch {
		font-size: 1.15rem;
		font-weight: 600;
		color: var(--ink);
		line-height: 1;
	}
	.cell.active .ch {
		color: var(--amber);
		text-shadow: 0 0 10px var(--amber-glow);
	}
	.cd {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		height: 5px;
	}
	.cd i {
		display: inline-block;
		height: 4px;
		border-radius: 2px;
		background: var(--ink-dim);
	}
	.cell.active .cd i {
		background: var(--amber);
	}
	.cd .dit {
		width: 4px;
	}
	.cd .dah {
		width: 12px;
	}
	.hint {
		margin: 0;
		text-align: center;
		color: var(--ink-faint);
		font-size: 0.72rem;
		letter-spacing: 0.08em;
	}
</style>
