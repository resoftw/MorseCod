<script lang="ts">
	import { onMount } from 'svelte';
	import type { CwPlayer } from '$lib/morse/audio';

	let { player }: { player: CwPlayer } = $props();

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		let raf = 0;
		let data: Uint8Array | null = null;

		const draw = () => {
			raf = requestAnimationFrame(draw);
			const w = canvas.clientWidth;
			const h = canvas.clientHeight;
			if (canvas.width !== w * devicePixelRatio) {
				canvas.width = w * devicePixelRatio;
				canvas.height = h * devicePixelRatio;
				ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
			}
			ctx.clearRect(0, 0, w, h);

			// graticule
			ctx.strokeStyle = 'rgba(184,255,207,0.07)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (let x = 0; x <= w; x += w / 12) {
				ctx.moveTo(x, 0);
				ctx.lineTo(x, h);
			}
			ctx.moveTo(0, h / 2);
			ctx.lineTo(w, h / 2);
			ctx.stroke();

			const analyser = player.getAnalyser();
			ctx.lineWidth = 2;
			ctx.strokeStyle = '#b8ffcf';
			ctx.shadowColor = 'rgba(184,255,207,0.8)';
			ctx.shadowBlur = 8;
			ctx.beginPath();
			if (analyser) {
				if (!data || data.length !== analyser.fftSize) data = new Uint8Array(analyser.fftSize);
				analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
				for (let i = 0; i < data.length; i++) {
					const x = (i / (data.length - 1)) * w;
					const y = h / 2 + ((data[i] - 128) / 128) * (h / 2 - 3);
					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
			} else {
				ctx.moveTo(0, h / 2);
				ctx.lineTo(w, h / 2);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;
		};
		draw();
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="scope">
	<canvas bind:this={canvas}></canvas>
	<span class="tag">RF MONITOR</span>
</div>

<style>
	.scope {
		position: relative;
		height: 72px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background:
			radial-gradient(100% 140% at 50% 0%, rgba(184, 255, 207, 0.06), transparent 70%),
			#060905;
		box-shadow: inset 0 2px 12px rgba(0, 0, 0, 0.8);
		overflow: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.tag {
		position: absolute;
		top: 5px;
		right: 8px;
		font-family: var(--display);
		font-size: 0.5rem;
		letter-spacing: 0.2em;
		color: rgba(184, 255, 207, 0.35);
	}
</style>
