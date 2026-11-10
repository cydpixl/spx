# Wing integration — November 10, 2026

Status: published on https://spx7.pages.dev as release 2026.11.10.90. The media gateway is https://spex-wing-media.netlify.app. It runs on Netlify Edge Functions and does not use a viewer's PC, a local relay, a tunnel, or a new paid billing plan.

The integration preserves the latest sports change from commit 323dbef, all existing sources, uploads, account storage, fullscreen handling and AirPlay controls. Select **Servers → Secret · Wing** for the verified source. The player also lists Nebula, Lisbon, Solara and Athens; availability varies by title and provider.

## How it works

wing-client.mjs resolves TMDB movies and episodes through the public API at https://api.wing.st using the current WebAssembly request encoder supplied by that service. No credentials or fixed movie playlists are embedded in production code. Odyssey resolves to the same Lightspeed playlist observed in Cinejoy.

wing-player.mjs uses pinned HLS.js 1.7.4 in Chrome and native HLS in Safari. Its session-checked message bridge supports play/pause, seeking, volume, speed, available HLS quality/audio tracks, supplied subtitles and existing external-subtitle tools. Automatic quality follows the player size; manual quality is available where the browser exposes HLS levels.

The video context menu provides **Copy playlist link** and **About this video**, showing actual resolution, bandwidth estimate, buffered duration, and decoded/dropped frames. Copying the original source playlist displays a visible confirmation. Shift+right-click retains the browser menu; keyboard context-menu access is supported.

## Independent media transport

Netlify's Node serverless transport and the original Cloudflare Worker could not retrieve the media. Netlify Edge Functions successfully fetch and stream the same resources. The deployed edge gateway is configured by wing-gateway/netlify.toml, with its handler in wing-gateway/netlify/edge-functions/media-edge.js.

The shared handler permits only the two observed Wing media hosts, validates requesting Spex origins, rejects arbitrary destinations and redirects, forwards valid byte ranges, and streams binary responses without buffering whole videos. It rewrites variant, audio, key and initialization links in HLS manifests, including Nebula manifests whose names end in playlist.jpg. It does not copy client cookies or credentials upstream. Playback URLs continue to be resolved on demand.

wing-config.mjs selects the verified public gateway. wing-gateway/api/index.mjs remains a portable Node/Vercel entry point; it is not the deployed transport. The service uses the existing Netlify free account and its normal quota; no unlimited-bandwidth guarantee is made.

## Verification

node --test tests/*.test.mjs: 56 passing tests. Coverage includes URL/Origin restrictions, nested HLS rewriting, image-extension manifests, Range streaming, failure handling, TMDB/episode validation, fresh source-switch documents, stale-session rejection, and preservation of existing CineSrc quality preferences.

Chrome public-site checks:

- Odyssey on Secret decoded at 1920 × 1080 with advancing time, ready state 4, and actual decoded-frame counts. A public-preview sample showed zero dropped frames and approximately one minute buffered.
- Breaking Bad S1 E1 on Secret decoded at 1920 × 1080 on the live title route, with advancing playback and a 58:06 duration.
- Source switching creates a new iframe document and carries saved playback position.
- Pause, forward seeking, manual 1080p selection, supplied subtitle/audio menus and video diagnostics were checked. The original playlist copied from the video menu matches Cinejoy's current playlist.
- Public endpoint checks returned HTTP 200 for manifests and WebVTT captions and HTTP 206 with the expected Content-Range for an initialization-segment byte range.

Full-catalog availability and every alternate provider are not guaranteed. Physical Safari/iPhone/AirPlay devices and Wing watch-party synchronization remain unverified. Existing watch-party sources are unchanged.

## Development and deployment

For local work, run node tools/serve-wing.cjs. This optional development server binds only to loopback and proxies read-only catalog calls; it is not used by the public site.

Deploy the media gateway from wing-gateway/ with the linked Netlify site spex-wing-media (site ID df651dda-bc31-4511-9b4a-855c0dddf746). Deploy the frontend to the existing Cloudflare Pages project spx7; staging must change the HTML base from /spx/ to /. The repository retains /spx/ for GitHub Pages compatibility. Local Netlify state, tokens and environment files are excluded from source packages.
