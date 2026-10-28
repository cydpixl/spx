# Spex refinement verification

Release 2026.10.28.73. Music stays removed.

Cinejoy Settings was inspected live. Its cards use rgba(20,20,20,.6) with blur(20px); Spex now uses that material and restores full silk visibility. The theme picker is a compact dropdown, with the existing choices preserved. Source ranking is absent from settings; source rows use names, signal bars and accessible hover/focus/tap details. File inputs have styled picker controls. A clipped mobile party shortcut was found and fixed.

Sports has a new vector wordmark and calendar. The actual feed supplied 48 events on October 28 and 12 on October 29; selecting October 29 reduced the list to 12 events. Month calculations were checked for leap years; date buttons support arrow keys. Domain availability comes from a fixed-allowlist server probe, cached for 60 seconds, with Up/Down/Unverified states and check timestamps. Ten live addresses returned Up in QA.

Shorts consumes official trailer metadata, supports video files and official trailer embeds, and has active-card playback, mute, next/previous, save and retry states. Browser QA showed 18 trailers, actual playback time advancing and no Multiview buttons. Four ready-made lists loaded 12 poster previews; saving a list produced six editable titles. Existing lists are preserved.

Watch-party chat passed local and live WebSocket tests: host/guest delivery, history on join, literal message text, 500-character bounds, rate limits and reconnect. Two real browsers exchanged chat messages, retained history after reload, and decoded native playback at width 2000 / readyState 4. The large floating party text is replaced by a compact control that hides with the player controls. Chat and rooms expire after 12 hours; history is bounded to 100 messages. A WebSocket close-code error found during testing was fixed.

Seven existing ranking/player-evidence regression tests passed. All 49 root JavaScript modules passed syntax checks. Worker build/dry run passed; startup measured 1-2 ms. 390x844 browser QA showed no horizontal overflow on settings, sources and Shorts. Source picker rows inside the player were visually checked at this width. Full playback across every external provider/title is not claimed.

Deploy targets: spx7.pages.dev, spx7.web.app, spx7.firebaseapp.com, cydpixl.github.io/spx/, bogart.pages.dev. Final runtime-asset and browser evidence is retained in the task outputs. Original source changes are synchronized separately after checking for concurrent edits.
