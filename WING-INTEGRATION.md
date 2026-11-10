# Wing integration — November 10, 2026

Status: local movie and TV playback verified; public rollout blocked by media hosting. No production frontend was published and no remote Git branch was pushed.

The API at `https://api.wing.st` lists Secret, Nebula, Lisbon, Solara and Athens. `wing-client.mjs` implements the service's public request protocol using the current WebAssembly encoder from that API. It resolves TMDB movies and episodes at playback time; it contains no fixed movie URLs or credentials. The Odyssey resolved to the exact Lightspeed playlist observed in Cinejoy.

The native player uses pinned HLS.js 1.7.4 in Chrome and native HLS in Safari. It integrates play/pause, seeking, volume, speed, available HLS quality/audio tracks, supplied subtitles and existing external-subtitle tools. The video context menu provides Copy playlist link and About this video, including actual resolution, bandwidth estimate, buffered duration and decoded/dropped frames. Existing source choices, uploads, fullscreen, AirPlay and account storage are retained. Wing watch-party synchronization and physical Safari/AirPlay devices have not been verified.

## Local playback

Run `node tools/serve-wing.cjs`, then open `http://127.0.0.1:8790/spx/watch/tmdb-movie-1368337`. Select Secret · Wing if the local automatic ranking prefers another source. The development server binds only to loopback, supplies a local media gateway and forwards read-only catalog requests. It enables Wing only in the locally served configuration; it does not modify source files or the public site. Stop it with Ctrl+C.

## Public rollout blocker

Lightspeed responds with 404 unless requests include the provider's Origin and Referer. The restricted media gateway works from local Node.js, but the same requests through the deployed Cloudflare Worker at `https://spex-wing-media.cydpixl7.workers.dev` still receive 404. The precise additional Cloudflare-egress restriction is unconfirmed. The origin site refuses iframe embedding.

Both connected Vercel accounts rejected project creation with HTTP 402, `resource_creation_blocked`: the team exceeded fair-use limits. The existing local Vercel CLI token is invalid. No billing, account or security settings were changed. AppDeploy's backend transport was inspected and only exposes buffered JSON responses, unsuitable for this native streaming gateway.

`wing-gateway/` contains the Node.js/Vercel gateway entry point and configuration. Deploy this folder once a usable backend account is available, verify master playlists, variants, initialization segments, video/audio segments, subtitle files and Range requests from the actual Spex domain, then set `WING_GATEWAY` in `wing-config.mjs` to that verified origin. It intentionally defaults to `null`, keeping nonworking Wing choices out of public builds. Cloudflare deployment is retained as a documented failed transport test, not a working public source.

The gateway permits only the two observed media hosts, checks requesting Spex origins, refuses arbitrary URLs and redirects, rewrites nested HLS media/key links, and streams binary bodies without buffering whole videos. Additional Wing media hosts require explicit validation before allowlisting.

## Verification

`node --test tests/*.test.mjs`: 55 passing tests, including gateway URL/Origin validation, manifest rewriting, Range streaming, failure handling, title/episode validation, source-switch document navigation and preservation of existing CineSrc quality preferences.

Chrome checks: The Odyssey decoded at 1920 × 1080 with actual frame counts; Breaking Bad S1 E1 decoded with a 58:06 duration. Pause and forward seeking worked. English/Spanish/French subtitle tracks and English audio were listed for Odyssey, English subtitle selection worked, and Copy playlist link returned the exact original Lightspeed URL. The full local Spex title route loaded its catalog details and played through Secret. Native source switching invalidates prior sessions and creates a fresh iframe document, preventing fragment-only stale-player bugs.

Full-catalog availability, every alternate Wing server, mobile layout, Safari, casting and watch parties were not exhaustively tested. An API resolution or iframe load alone is not treated as playback success.
