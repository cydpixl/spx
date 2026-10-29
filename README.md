# Spex Movies

Jaymes Spex’s film and series library.

Live site: https://cydpixl.github.io/bogart/

Includes Buddy, Clown Panic, and The Traitors Season 5 episodes 1–5. Media streams from the public R2 library.
# October 15 streaming update

The uploaded Buddy, Clown Panic and The Traitors S5E1–E5 files retain their existing R2 URLs and native player. Other catalog titles use CineSrc or MoviesAPI. The settings switch **Enable advertisements**, applied with **Save and reload**, allows four additional sources and removes iframe popup restrictions. With ads disabled, only the two primary sources are offered in a sandbox; in-player ads may still appear.

The catalog includes search, provider filtering, sorting, pagination, title details, trailers, cast, recommendations and season/episode browsing. Native uploads take priority over external playback for matching titles and episodes. Lists and viewing progress stay in this browser.

The GitHub Pages base is `/bogart/`. For the Cloudflare Pages release, use an HTML base tag of `/` and retain SPA redirects. `catalog-worker/` contains the metadata-only gateway; it reads the preserved Connections catalog across accounts and cannot route uploads or media mutations. No R2 files or existing account records are replaced.

## Spex Movies release 2026.10.15.3

The existing URLs are unchanged. No account is required. Includes named browser-local lists with JSON import/export and share links; history editing; watched episode/season marks and episode ratings; appearance themes, episode grid/carousel, page/modal details, spoiler mode, reduced motion; native SRT/WebVTT subtitles with size/color/timing; speed, video adjustments and sleep timer menus; trailer Shorts; optional PeerJS two-device watch-party interface. Cross-device party playback requires an available signaling service and source playback API.

VidRift is intentionally unsandboxed and available only with advertisements enabled. A user observed the sandboxed provider become a white screen and request sandbox removal after initially playing.

Separate Spex account storage, public community lists/comments/votes, Trakt/Simkl OAuth and integrated person filmographies are not included in this release. Personal data is browser-local; export a backup to transfer it. Cast opens a biography link. External subtitles/audio/quality use the selected source's controls. No third-party controls are represented as working cross-origin APIs when unsupported.

## October 19 browsing update

Search displays 50 titles from the live daily trending feeds: 25 movies and 25 shows, alternating by rank. Empty search prompts rotate every seven seconds without changing typed queries. Right-click a title, use Shift+F10, or long press on touch to play, view details, open a new tab, manage lists, mark watched, or copy its link. Holding Shift while right-clicking retains the browser menu.

The white navigation pill slides between sections and remeasures after resizing and font loading. Reduced motion disables that animation while preserving the selected state. Featured-slide indicators remain visible when rotation is paused. Poster and continue-watching hover previews preserve the hero backdrop. Rating stars are yellow.

## October 19 reference UI update (2026.10.19.19)

Movies and Shows each have seven featured titles, real TMDB image logos, upcoming/airing-season cards, country/genre/year/provider/sort menus, progressive loading and a floating filter bar that returns to the page when scrolling up. All 31 reference country choices are supported by the metadata gateway. Search is seven across on desktop with 50 initial trending titles and Show more batches that preserve the movie/show balance and exclude duplicates.

Settings keeps every section on one scrolling page and docks its section controls. Existing settings, provider order, subtitles, Febbox, backup/restore, local and cloud accounts, uploads and playback are retained. Trakt and Simkl linking are intentionally excluded at the user's request. My Lists gains inline creation and public discovery while retaining import/export, sharing, publishing, rename and list management. Cast portraits use a person silhouette when unavailable. Continue Watching has animated opening and closing; only featured hero selection changes the ambient backdrop.

QA scripts: work/qa-outlaw-v19.mjs and work/qa-outlaw-v17.mjs in the parent project.

## Sports release 2026.10.21.29

`/sports` adds live/upcoming events and sports channels, team search, sport/provider filters, merged event sources, a responsive embedded player and manual next-source switching. Uses the public Streamed, BINTV, PPV and Matchora JSON feeds; no API key is needed. The event feeds refresh every 90 seconds while visible and provide explicit outage and expired-event states.

BINTV is preferred and sandboxed; NBA playback decoded inside the integrated app. Streamed Golf SD decoded in standard mode. Streamed, PPV and Matchora reject iframe sandboxing and use standard frames. Sampled PPV and Matchora playback stalled and are not represented as verified sources. Third-party ads/pop-ups and provider-native controls apply. See `../../work/sports-research/sports-audit.md` for the browser inventory, sandbox matrix and exact limits. Movies, shows, anime audio controls, R2 URLs and account data are preserved.

## Spex release 2026.10.21.30

Visible branding is now Spex; original artwork, routes, account storage, library keys, uploads and APIs are retained. Sports uses the existing catalog filter classes with custom keyboard-accessible listboxes. Favorite sports and teams are saved in this browser and sorted before other events. The Favorites dialog manages them and the in-app alert preference. The notification bell shows live and starting-soon alerts while the site is open, with persistent unread state and duplicate prevention; this is not closed-app push notification delivery.

Search adds a small microphone using the browser SpeechRecognition/webkitSpeechRecognition API. Interim/final speech results feed the existing live search, speech end/silence stops recognition, listening/speaking uses the current accent, and navigation aborts capture. Unsupported browsers disable the microphone while retaining typed search; permission, device and network failures receive explicit messages. Speech lifecycle and result wiring were tested with simulated browser events; a real Chrome permission denial was tested. Acoustic transcription from a physical microphone remains unverified. No audio was generated.
## Release 2026.10.29.75

Release notes are available in the app at `/updates`. The canonical, searchable history is `releases.json`; add a dated entry with a version, title, and grouped changes for each future release. `release-history.mjs` renders it and the shared shell links to it from Explore, Settings, and the footer.

The shared control system lives in `control-icons.mjs` and `interface-system.css`. `surface-controls.mjs` upgrades legacy glyph controls as each surface mounts while preserving their event handlers, labels, numeric speed values, and dimensions. The final stylesheet owns watch-party geometry; conflicting old party rules were removed from the previous surface layers. Run `node build-design.mjs` after editing source CSS.

QA: 390×844 and 1440×1000 audits covered updates, settings, sources, Shorts, Multiview, books, lists, and sports. All had no horizontal overflow, no visible legacy arrow controls, and no application page errors. Calendar selection persistence, keyboard month navigation, leap-year offsets, and upcoming-event filtering passed. Two independent Chrome contexts decoded the native video and verified play/pause, seeking, 1.5× speed, chat in both directions, literal message text, draft preservation, host/guest reloads, history, and leave behavior. Sampled drift after synchronization was 0.062 seconds. Browser mobile emulation is not a physical iPhone test. External player synchronization remains dependent on each provider's existing API support.
