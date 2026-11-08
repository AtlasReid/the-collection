# Working on The Collection

Read `README.md`, `docs/CONTINUING.md` and `docs/ASSETS.md`. This checkout is self-contained. Use Node.js 20+: `node server.mjs` previews on port 4319; `node checks/run-checks.mjs` runs the complete checks. No install or build is needed. Preserve relative runtime URLs, repository-prefix hosting and `.nojekyll`.

## Shared interface

- `music/player.js` and its modules serve the 3D laptop, `dev/music/` desktop preview and `music/` CSS compatibility view. Change shared behaviour there; do not fork the player.
- The interface is an unofficial, playful macOS/Music study. Menu, account, power and subscription commands stay inside the prototype; never operate the real computer or its Music library. Preserve factual provider/licence copy. Services under Music is disabled.
- Preserve the managed Music window, real close/minimise/maximise, dock recovery, Help and virtual TextEdit acknowledgements. Close stops playback; minimise preserves it. Keep stable SVG control nodes through playback updates.
- Apple → System Settings and the Graphics drawer share the same validated settings store. Music Settings remains separate. Dispose subscriptions and merge cross-tab changes from fresh storage reads.
- Move the entire `screen-desktop` between laptop and compact dialog, retaining player/windows/iframes. Native close-up uses the same DOM without a perspective bitmap; tilted views use the exact homography. Logical widths are 1024 Comfortable / 1280 Compact, separate from backing resolution and devicePixelRatio.

## Scene and controls

- Keep the full-viewport 3D world with separate branding and fixed glass collection panel outside the animated shell. The panel collapses its navigation and credits, keeping Graphics and collapse actions visible. Its skip link expands the navigation; short layouts scroll internally. Hide all site overlays in focused mode. Preserve the 360 px scene minimum and focused min-height:0.
- Graphics remains an icon beside collapse. Its nonmodal drawer has a separate unclipped mount, follows the header, fits the viewport and temporarily hosts inside the compact dialog. Preserve Escape/outside-click/focus behaviour, glass-off and reduced-transparency fallbacks.
- Keep on-demand rendering, DPR caps, texture reuse and focused3D rest. Camera/CD motion, resizing and settings wake rendering; the HTML desktop stays live. Do not add a perpetual idle loop or claim GPU-memory reassignment.
- Maintain the native HTML layer below alpha WebGL, with a matching zero-alpha depth-writing aperture. Use `setScreenApertureActive()` before render; never hide the parent screen, raise HTML above foreground discs or move the opening through the notch. Update camera matrices before projecting. Preserve foreground-input occlusion and compact restoration.
- Hardware display top corners are circular .045-unit arcs; bottom corners are square. The aperture clones that contour at screen-local z=.0002. The camera lens radius is .016 with 24 segments. Preserve the common physical scale: 120 mm CDs, 15 mm open holes and 1.2 mm substrate.
- CD covers fill the circular upper face using centred square-to-circle UVs with only 0.35 mm radial margins. Reuse the case texture; do not restore broad reflective sectors or a small central label. Preserve the silver underside and actual hole, case opening and unobstructed insertion path.
- Preserve the centred laptop/drive/rack/case composition, +12° laptop yaw and attached USB parts. `fitDeskOrbit` uses .82 of conservative framing distance with a 1.035-padded composition clamp. Manual zoom limits use the conservative radius. Keep the home target stable, recenter normal desk endpoints and preserve displayed pan on interrupted return flights.
- Keep eased focus/return timing 1015/875 ms and 80 ms preparation, delivered-frame clock and reduced motion. Hide screen pills during movement and restore normal size after settlement. Keep Open Music hover/focus reveal, Back to desk and compact fallback.
- Camera input remains available during CD operations; the busy lock protects media actions and hover writes. Preserve operation ownership and staged case/disc motion.

## Catalogue, playback and persistence

- `music/catalogue.js` owns nine albums/324 tracks: Momento7, Portraits11, Still As Your Sleeping10, Frieren70, Without Fear Complete21, Sonder12, Scottish Bagpipes35, Clair Obscur154 and I've told the trees everything4. The standalone preview alone also offers Forss/Flickermood as a connection test.
- Keep real album/track IDs and artwork stable. `music/collection.js`, its six SVG covers and `laptop.js` remain regression fixtures; they are excluded from the production collection. Preserve nine-case compatibility positioning.
- Scottish Bagpipes retains all 35 Apple catalogue entries. Only five same-performer/title/duration matches use individual SoundCloud IDs from another compilation; identical recording/mastering is unconfirmed. No album-playlist fallback. The other 30 open source/listening links and never run the silent demo clock. Apple Music is an external link, not a native/API integration.
- SoundCloud uses its visible official widget/API, validated URLs, source/uploader credits and encrypted-media delegation. Connect after the first-play notice. Retain one iframe through foreground/minimised changes; a destroyed transport needs a fresh iframe. Do not alter the provider's Hear more screen. Metadata is not proof of playback availability or DRM.
- Bandcamp uses validated public album/track IDs and its visible official embed. Music cannot observe its live state or remotely control seek/volume/queue. Retain the frame while backgrounded/minimised; Stop, close, eject or switching providers unloads it. Do not invent an API, proxy streams or download audio.
- Imports save catalogue IDs, never audio. Keep `atlasreid-music-import-library-v1` and interface/graphics storage schemas stable. The desktop preview isolates its ledger under `atlasreid-music-ui-preview-v1`; its reset must not clear the main library. Do not clear unrelated storage.
- Import marks/checkboxes belong only to the inserted CD view. Library tracks omit those columns. Keep scrolling content underneath the floating transport with enough clearance for final rows.

## Validation and publishing

Run checks appropriate to changes and verify meaningful browser flows for rendering/input work. Record current outcomes and material limits in `docs/CONTINUING.md`; geometry checks are not physical-touch or audible-output proof. Keep docs concise and current rather than appending a development diary.

Retain the bundled Three.js MIT licence, complete acknowledgements and asset provenance. No application/artwork open-source licence is selected; credits do not establish third-party publication permission. Never publish credentials, browser storage, private reference archives, local backups or unrelated projects.

Use `codex/` for new branches. Inspect remote state before publishing; do not force-push, rewrite history, change visibility or configure deployment without explicit user authorisation.
