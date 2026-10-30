# Sports release 78

Validated 2026-10-29. Full-page calendar with independent team schedules, source layout corrections, alternate PPV broadcasts, StreamFree integration and reference chat gate.

`node --test tests/sports-regression.test.mjs`: 13 passing tests. All root JS modules passed syntax checks. Worker dry run and deployment passed. The live monthly-cap fallback returned 1,646 November NCAA games instead of the provider's first 1,000.

40 live browser checks passed at widths 320–1920: calendar/source overflow, combined sport/league/team filters, view and month changes, bounded menus, source selection/search, connected chat, gate/inert behavior and settings choices. Screenshots and detailed API findings are retained in the task's outputs directory.

The schedule feed covers 14 named leagues plus stream-provider listings. Scheduled events without streams remain visible. Source endpoints can fail independently; Streamed's browser API was CORS-blocked during validation. Exhaustive external video decoding is not claimed.
