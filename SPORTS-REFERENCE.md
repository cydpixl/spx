# REAL sports reference audit and Spex implementation

Reviewed November 1, 2026 using REAL's official product site and documentation, then tested the corresponding public sports data feeds and Spex UI. This is a feature comparison, not an affiliation or a claim of complete parity.

## Sources reviewed

- [Product and sports coverage](https://www.realapp.com/)
- [Core experience and FAQs](https://docs.realapp.link/basics/faqs)
- [Pro features: predictions, notifications and trackers](https://docs.realapp.link/basics/real-pro)
- [Notification types](https://docs.realapp.link/basics/notifications)
- [Rating system](https://docs.realapp.link/basics/real-rating-system)
- [Karma and community rewards](https://docs.realapp.link/basics/karma)
- [Play cards and collections](https://docs.realapp.link/collect/play-cards.md)
- [Official changelog](https://docs.realapp.link/updates/changelog)

The official website and documentation describe different coverage snapshots. The current website lists scores, box scores, player stats, predictions and news; the docs additionally describe social engagement, collectible cards and currencies. The audit treats those as separate product systems rather than assuming they all have publicly reusable APIs.

## Implemented in Spex

| Area | Spex behavior | Practical boundary |
| --- | --- | --- |
| Personal setup | Sports, basketball league choices, teams, players and notification preferences | Saved in this browser; NBA defaults on |
| Player identity | Actual current team ID, full team name, logo, player photo and position | Uses current provider records, including transfers; missing data stays unavailable |
| Player directory | NBA scoring leaders plus searchable team rosters across configured leagues | Leaders are ranked by points per game, not REAL's proprietary ratings |
| Player pages | Season and career stats, game logs, historical game-log season selector, follow control and linked team | Only published data appears |
| Team pages | Actual logo, name, record, standings summary, roster and follow control | Team data and rosters depend on league coverage |
| Scoreboards | Actual scores, game clock/status, Following and All scores | 30-second visible-page refresh; official finals override stale provider flags |
| Game center | In-app matchup, team stats, box scores, game updates, stream link when available and copyable game link | A streaming listing does not establish that a game is live |
| Play-by-play | Searchable real game plays with score, period and clock | Some leagues/game feeds do not publish play-by-play |
| Shot chart | Published basketball shot coordinates, made/missed markers and play descriptions | Appears only when valid coordinates exist; no fabricated locations |
| Standings | Real conference/league tables and links to teams | Published standings only |
| News | Live provider headlines, images and links to original articles | External article pages retain their source attribution |
| Game chat | Existing shared Spex event rooms, sign-in composer, presence and reconnect handling | Uses Spex's community, not REAL's community or messages |
| Squads | Named groups of followed players with profile links and deletion | Browser-local groups; no invented community leaderboard |
| Trackers | Set a numeric player stat target from a game's box score; progress and target-hit notification while open | Actual numeric data only; no betting odds or claimed payouts |
| Personal picks | Choose a winner before a game starts; lock picks at start and show final correctness | Browser-local picks; no stakes, currency or fabricated community percentages |
| Saved plays | Save published game moments, revisit their game and remove saved items | Personal browser-local collection; not tradable cards |
| Notifications | Score changes and optional browser notifications; tracker target hits | Requires Sports to remain open; closed-app push is not implemented |
| UI controls | Styled accessible switches, pills and consistent dropdown arrows | Native checkbox boxes are removed from Sports setup and favorites |
| Multiview and streams | Existing Spex multiview and provider/source features are retained | Playback availability remains controlled by external providers |

## Not implemented as REAL equivalents

1. **Rax, Karma, tradable player/team/play cards, packs, marketplace, ownership, rarity and rewards.** REAL describes an account-backed economy. Spex does not claim access to its balances, inventory, marketplace or settlement services. Saved plays are explicitly personal bookmarks.
2. **REAL's proprietary excitement/performance ratings and historical rating rankings.** The official guide describes several contextual inputs but does not publish a complete reproducible algorithm or an API contract. Spex does not relabel arbitrary numbers as REAL ratings.
3. **Community prediction markets and payouts.** Personal picks work locally; Spex has no liquidity pool, market percentages, cashout, wagers or financial rewards.
4. **REAL's social graph, public groups, DMs, community polls, emoji challenges, global leaderboards and badges.** Existing Spex game chat works; this release does not impersonate REAL members or import their activity.
5. **Closed-app push and advanced play-type notification rules.** Open-page score and tracker notifications work. A persistent subscription backend and service worker push delivery are separate unfinished work.
6. **Full licensed historical coverage and media.** Public data coverage varies by league and season. REAL-only replays, licensing, historical collectibles and exclusive datasets are not substituted with fake content.

These gaps remain explicit. The release adds a working sports data experience informed by REAL; it does not claim to reproduce every REAL service.

## Implementation and validation

- `sports-model.mjs`: current team normalization, safe display helpers, standings flattening and numeric tracker parsing.
- `sports-hub.mjs` / `sports-hub.css`: explorer, profiles, game center, collections, squads, picks and trackers.
- `sports-setup.mjs`: actual team identity on selection cards and accessible notification switches.
- `sports-live.mjs`: profile links, actual team labels, game-center links and official score updates.
- `sports-worker/index.mjs`: validated allowlisted game/team/player/stat/news routes with bounded upstream reads, caching and timeouts.

Unit tests cover identity normalization, escaping, missing data, standings, tracker parsing, gateway validation, event status and existing sports regressions. Browser validation covers player-to-team navigation, actual rosters, standings, news, NBA box scores and plays, saved play operations, squad creation/deletion, tracker target resolution, locked finished-game picks, switch behavior, mobile overflow and game links. Shared chat delivery uses the existing service; this pass verifies the game room UI without posting public test messages.
