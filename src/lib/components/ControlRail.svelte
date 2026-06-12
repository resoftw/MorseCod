<script lang="ts">
	import { settings, persistSettings } from '$lib/settings.svelte';

	function save() {
		persistSettings();
	}
</script>

<div class="rail panel screws">
	<div class="ctl">
		<div class="head">
			<span class="label">Speed</span>
			<span class="val">{settings.wpm}<small>WPM</small></span>
		</div>
		<input type="range" min="5" max="40" step="1" bind:value={settings.wpm} onchange={save} />
	</div>

	<div class="ctl">
		<div class="head">
			<span class="label">Tone</span>
			<span class="val">{settings.frequency}<small>Hz</small></span>
		</div>
		<input
			type="range"
			min="400"
			max="1000"
			step="10"
			bind:value={settings.frequency}
			onchange={save}
		/>
	</div>

	<div class="ctl">
		<div class="head">
			<span class="label">Volume</span>
			<span class="val">{Math.round(settings.volume * 100)}<small>%</small></span>
		</div>
		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			bind:value={settings.volume}
			onchange={save}
		/>
	</div>

	<div class="ctl fw">
		<div class="head">
			<span class="label">Farnsworth</span>
			<button
				class="toggle"
				class:on={settings.farnsworth}
				role="switch"
				aria-checked={settings.farnsworth}
				onclick={() => {
					settings.farnsworth = !settings.farnsworth;
					save();
				}}
			>
				<span class="pip"></span>
				{settings.farnsworth ? 'ON' : 'OFF'}
			</button>
		</div>
		{#if settings.farnsworth}
			<div class="head">
				<span class="label">Spacing</span>
				<span class="val">{settings.effectiveWpm}<small>WPM</small></span>
			</div>
			<input
				type="range"
				min="3"
				max={settings.wpm}
				step="1"
				bind:value={settings.effectiveWpm}
				onchange={save}
			/>
		{/if}
	</div>
</div>

<style>
	.rail {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 16px 22px;
	}
	.ctl {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.val {
		color: var(--amber);
		font-size: 0.95rem;
		font-weight: 600;
		text-shadow: 0 0 8px var(--amber-glow);
	}
	.val small {
		color: var(--ink-dim);
		font-size: 0.6rem;
		margin-left: 3px;
		text-shadow: none;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-family: var(--display);
		font-size: 0.55rem;
		letter-spacing: 0.15em;
		color: var(--ink-dim);
		background: #0a0c07;
		border: 1px solid var(--line);
		border-radius: 20px;
		padding: 5px 12px;
		cursor: pointer;
	}
	.toggle .pip {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--ink-faint);
	}
	.toggle.on {
		color: var(--amber);
		border-color: var(--amber-dim);
	}
	.toggle.on .pip {
		background: var(--amber);
		box-shadow: 0 0 8px var(--amber-glow);
	}
</style>
