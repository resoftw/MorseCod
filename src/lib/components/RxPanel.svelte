<script lang="ts">
	import { buildSchedule, type MorseSchedule } from '$lib/morse/morse';
	import type { CwPlayer } from '$lib/morse/audio';
	import { settings, persistSettings } from '$lib/settings.svelte';
	import { randomWord, type Difficulty } from '$lib/words';
	import MorseDisplay from './MorseDisplay.svelte';

	let { player }: { player: CwPlayer } = $props();

	let level = $state<Difficulty>('easy');
	let word = $state('');
	let schedule = $state<MorseSchedule | null>(null);
	let progressMs = $state(-1);
	let playing = $state(false);
	let guess = $state('');
	let phase = $state<'idle' | 'listening' | 'answered'>('idle');
	let correct = $state(false);
	let streak = $state(0);
	let raf = 0;
	let guessInput = $state<HTMLInputElement | null>(null);

	function tick() {
		progressMs = player.progressMs();
		if (playing) raf = requestAnimationFrame(tick);
	}

	function transmit(replay = false) {
		if (!replay || !word) word = randomWord(level, word);
		schedule = buildSchedule(word, {
			wpm: settings.wpm,
			effectiveWpm: settings.farnsworth ? settings.effectiveWpm : settings.wpm
		});
		player.frequency = settings.frequency;
		player.volume = settings.volume;
		player.onended = () => {
			playing = false;
			progressMs = -1;
		};
		player.play(schedule);
		playing = true;
		if (!replay) {
			guess = '';
			phase = 'listening';
		}
		raf = requestAnimationFrame(tick);
		guessInput?.focus();
	}

	function check() {
		if (phase !== 'listening' || !guess.trim()) return;
		player.stop();
		playing = false;
		progressMs = -1;
		correct = guess.trim().toUpperCase() === word.toUpperCase();
		if (correct) {
			streak += 1;
			if (streak > settings.hiScore) {
				settings.hiScore = streak;
				persistSettings();
			}
		} else {
			streak = 0;
		}
		phase = 'answered';
	}

	$effect(() => () => {
		cancelAnimationFrame(raf);
		player.stop();
	});
</script>

<div class="rx">
	<div class="topline">
		<div class="levels" role="radiogroup" aria-label="difficulty">
			{#each ['easy', 'medium', 'hard'] as const as l (l)}
				<button
					class="lvl"
					class:on={level === l}
					role="radio"
					aria-checked={level === l}
					onclick={() => (level = l)}>{l}</button
				>
			{/each}
		</div>
		<div class="score">
			<span class="label">Streak</span>
			<span class="num">{streak}</span>
			<span class="label">Best</span>
			<span class="num dim">{settings.hiScore}</span>
		</div>
	</div>

	<MorseDisplay {schedule} {progressMs} masked={phase !== 'answered'} />

	{#if phase === 'idle'}
		<p class="hint">A hidden word will be sent in CW. Copy it by ear.</p>
		<div class="actions">
			<button class="btn primary" onclick={() => transmit()}>▶ Send word</button>
		</div>
	{:else if phase === 'listening'}
		<form
			class="answer"
			onsubmit={(e) => {
				e.preventDefault();
				check();
			}}
		>
			<input
				type="text"
				bind:value={guess}
				bind:this={guessInput}
				placeholder="What did you hear?"
				autocomplete="off"
				autocapitalize="characters"
				spellcheck="false"
			/>
			<div class="actions">
				<button class="btn" type="button" onclick={() => transmit(true)}>↻ Replay</button>
				<button class="btn primary" type="submit" disabled={!guess.trim()}>Check</button>
			</div>
		</form>
	{:else}
		<div class="result" class:good={correct}>
			{#if correct}
				<span class="verdict">✓ CORRECT</span>
			{:else}
				<span class="verdict">✗ IT WAS</span>
			{/if}
			<span class="reveal">{word}</span>
		</div>
		<div class="actions">
			<button class="btn" onclick={() => transmit(true)}>↻ Hear again</button>
			<button class="btn primary" onclick={() => transmit()}>▶ Next word</button>
		</div>
	{/if}
</div>

<style>
	.rx {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.topline {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}
	.levels {
		display: flex;
		border: 1px solid var(--line);
		border-radius: 8px;
		overflow: hidden;
	}
	.lvl {
		font-family: var(--display);
		font-size: 0.58rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		padding: 9px 14px;
		background: transparent;
		color: var(--ink-dim);
		border: none;
		cursor: pointer;
	}
	.lvl + .lvl {
		border-left: 1px solid var(--line);
	}
	.lvl.on {
		background: rgba(255, 176, 0, 0.12);
		color: var(--amber);
		text-shadow: 0 0 8px var(--amber-glow);
	}
	.score {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.num {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--amber);
		text-shadow: 0 0 10px var(--amber-glow);
	}
	.num.dim {
		color: var(--ink-dim);
		text-shadow: none;
	}
	.hint {
		margin: 0;
		text-align: center;
		color: var(--ink-dim);
		font-size: 0.8rem;
		letter-spacing: 0.06em;
	}
	.answer {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.actions {
		display: flex;
		justify-content: center;
		gap: 12px;
	}
	.result {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 14px;
		padding: 14px;
		border-radius: 8px;
		border: 1px solid rgba(255, 69, 48, 0.4);
		background: rgba(255, 69, 48, 0.07);
	}
	.result.good {
		border-color: rgba(184, 255, 207, 0.35);
		background: rgba(184, 255, 207, 0.06);
	}
	.verdict {
		font-family: var(--display);
		font-size: 0.62rem;
		letter-spacing: 0.2em;
		color: var(--red);
	}
	.result.good .verdict {
		color: var(--phosphor);
	}
	.reveal {
		font-size: 1.4rem;
		font-weight: 600;
		letter-spacing: 0.18em;
		color: var(--ink);
	}
</style>
