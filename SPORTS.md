# Spex Sports development notes

Release: 2026.10.31.83. The in-app Devlog at `/updates#sports-about` contains the user-facing About section.

## Browsing and schedule

`sports.mjs` owns feed loading, reconciliation, filters and player selection. Keep native anchors for playable event cards. The app's delegated router intercepts only unmodified primary clicks; middle clicks and browser context menus retain native behavior. URLs use `document.baseURI`, preserving root and `/spx/` hosting.

`sports-calendar.mjs` provides month, week and agenda views with real feed badges and initials as an artwork fallback. Scheduled games without streams remain buttons that open schedule details. The shared sport picker sits at the top right, above the calendar; team, league, source, search and streams-only filters combine across views. Calendar dates and times use the viewer's local timezone. Schedule listings do not imply streams exist.

## Source aliases and five-star ratings

`sports-presentation.mjs` owns aliases and rating presentation:

| Display | Upstream |
| --- | --- |
| Alpha | BINTV |
| Bravo | Streamed |
| Charlie | PPV |
| Delta | Matchora |
| Echo | StreamFree |

Alternate feed numbers are assigned by sorted URL within each group for the current event, independently of asynchronous response ordering. Labels are not new providers. Provider identities remain intact in network requests and debugging data.

Stars are advisory, not fabricated community averages. Untested streams start at 2.5/5; Delta starts at 1.5/5 due to a previously observed advertising redirect. A viewer's explicit Works well report sets that exact URL to 4/5; Has a problem sets it to 1/5. Reports are local, bounded to 150 URLs and expire in seven days. No score implies guaranteed playback. Five stars are not awarded without stronger evidence. Iframe load events do not establish decoded playback. Sources are sorted by score on resolution; subsequent feedback updates stars without interrupting or switching the active stream.

Standard embeds are used for sports, including Alpha, because upstream players may reject a sandbox. Provider ads/pop-ups and native controls remain possible. Spex does not remove warnings rendered inside cross-origin providers. No external-provider playback guarantee is made.

## Live chat

`sports-chat.mjs` uses existing authenticated community endpoints for event rooms, message history and viewer presence. Polling runs every five seconds while visible, with a 15-second presence heartbeat. Leaving cancels UI updates, removes auth listeners, stops timers and deletes presence. No new backend or fake chat is used.

The entry gate preserves the existing opt-in. Sign-in is required to send; messages are escaped, capped at 500 characters, and retained as drafts on send failure. Enter sends, Shift+Enter inserts a line, IME composition does not submit, and concurrent sends are blocked. Poll requests do not overlap. Reading older messages retains scroll position; a new-message button jumps to the latest. Connection failure updates status and automatically retries. Timestamps render only when supplied by the API.

## Styling and deployment

`sports-redesign.css` is appended after the existing sports workspace rules in the generated `ui.css` bundle. Scoped rules retain shared navigation and other catalog/player pages. Reduced motion and mobile layouts are supported. Avoid running the legacy `build-design.mjs` release mutation unchanged: it currently contains older release constants; packaging should preserve the current index/release metadata.

## App-first experience (2026.10.31.84)

A full-screen, four-step setup chooses sports, searchable teams, roster players, live updates and optional browser notifications. Existing account names are used; no second account is created. Profile data is local to this browser and is editable with Personalize. Team directories cover the 14 configured leagues; tennis, cricket, combat sports and other stream categories can be followed but do not have team/roster directories in this release.

The sports-data gateway now allowlists `/live`, `/teams` and `/roster` routes. ESPN's publicly accessible site API supplies real scores, game clocks/status, logos, teams and athlete headshots. These are public, undocumented endpoints, not a licensed Real app integration; independent failures are surfaced. Scoreboard polling runs every 30 seconds while visible and enabled; the gateway caches scores for 15 seconds and directories for an hour. The feed keeps last-known rows for failed leagues, removes rows from successfully loaded empty leagues, and cancels requests on navigation.

Following shows selected teams and the teams of followed players; All scores shows the supported leagues. Stream links appear only when a matching event has a source. Other cards open real game details. Score changes for followed teams produce in-app alerts and, only after an explicit browser permission choice, optional browser notifications. Notifications require Sports to remain open; no background push or closed-app delivery is implemented.
