# Synced watch parties

Open a video, select Settings > Watch Party > Start a watch party, then copy the invite link. Guests open that link or paste its room code in their own party panel. The host controls title/episode, source, play/pause, seeking and playback speed. A guest can use Enable playback if their browser needs a gesture, or Resync with host to correct their player.

## Operation

- `party-worker/` deploys the `spex-watch-party` Worker. One SQLite Durable Object owns each room and its playback timeline. No media crosses the room connection.
- Rooms admit up to 12 connections and expire after 12 hours. Random 96-bit invite codes grant guest access; a separate 256-bit token grants host authority. The host token is sent inside the WebSocket hello and retained only in the host tab's session storage.
- Guest messages cannot modify playback or the selected title. Sources and media routes are validated server-side; messages have size and frequency bounds. WebSocket origins are restricted to Spex domains and local development.
- Automatic reconnects and same-tab reloads retain membership. Guests pause when the host is disconnected or closes the player. The host's stored title/source is restored after a reload.
- Original videos, CineSrc, MoviesAPI and AniEmbed have sync adapters. Providers without playback telemetry cannot start a synced party. External provider availability and browser autoplay rules still apply.

## Verification on October 27, 2026

Three isolated Chrome browser contexts, including a 390px mobile viewport, joined by invite and decoded native video. Host play/pause, seek and speed changes synchronized. Observed playback drift stayed below 0.5 seconds in representative samples. Guest reconnect, host and guest reload, host departure and refusal of a guest timeline overwrite passed. Native episode changes loaded the host's selected episode on the guest. No application page errors occurred in the native suite.

Two independent Chrome contexts also decoded CineSrc playback and synchronized play, seeking and pause, with approximately 0.3 seconds measured drift. MoviesAPI and AniEmbed adapters have not received live playback verification in this release. Mobile emulation is not a physical iPhone test.

The task workspace retains browser QA scripts, JSON results and desktop/mobile screenshots in `output/`.
