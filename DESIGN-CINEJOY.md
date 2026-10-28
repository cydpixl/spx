# Cinejoy parity pass

Visual thesis: match Cinejoy's measured cinematic artwork, quiet translucent controls, white primary actions, system typography, generous gutters, and restrained image-backed color.

Content plan: preserve hero, continue watching, providers and catalog shelves; preserve full title metadata, cast, trailers and recommendations; keep Sports, Read, Music, Multiview and domains available through one matching feature menu.

Interaction thesis: retain the moving navigation marker, smooth hero crossfades, and reference-style poster reveals. Add accessible feature-menu disclosure and consistent overlays. Preserve reduced motion and existing data/API behavior.

Reference inspected live at 1280 × 720: Cinejoy home, Movies, and title details. Home hero is 85vh with 64px gutters, a 52px primary action, 18/28 summary, 16/24 metadata, and 20/28 shelf headings. The header begins 24px from the top and 48px from the sides. Main tabs are Home, Movies, Shows, My List, with Search and Settings icons. Spex-only features use an extra grid icon, with the same visual treatment.

The existing full Spex implementation is retained. A generated CSS bundle preserves existing rules in source order and adds the measured shared skin. No storage keys, accounts, source lists, uploads, catalog APIs, watch-party protocol, or media URLs are replaced.
