/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { base, build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `morsecod-${version}`;
const FONT_CACHE = 'morsecod-fonts';
const ASSETS = [...build, ...files, ...prerendered];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE && key !== FONT_CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})
	);
});

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	// Google Fonts: cache-first so the app works fully offline after first load.
	if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
		event.respondWith(
			caches.open(FONT_CACHE).then(async (cache) => {
				const hit = await cache.match(request);
				if (hit) return hit;
				const res = await fetch(request);
				if (res.ok || res.type === 'opaque') void cache.put(request, res.clone());
				return res;
			})
		);
		return;
	}

	if (url.origin !== sw.location.origin) return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			const hit = await cache.match(request);
			if (hit) return hit;
			try {
				const res = await fetch(request);
				if (res.ok) void cache.put(request, res.clone());
				return res;
			} catch (err) {
				// Offline navigation falls back to the app shell.
				const shell = await cache.match(`${base}/`);
				if (shell) return shell;
				throw err;
			}
		})
	);
});
