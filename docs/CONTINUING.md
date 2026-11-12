# The Collection v1.0.0 — continuation notes

Updated 12 November 2026, following the v1.0.0 release. Read [README](../README.md), [AGENTS](../AGENTS.md) and [asset provenance](ASSETS.md) before changing the project. This checkout contains the continuing source; no private workspace, chat or reference archive is required.

## Run and entry points

Use Node.js 20+; no installation, build step or application API keys are required.

```sh
node server.mjs
node checks/run-checks.mjs
```

Open `http://127.0.0.1:4319/`. The server also supports `BASE_PATH=/the-collection/` for repository-prefix checks. Keep runtime URLs relative; use HTTP rather than `file://`.

- `index.html`, `scene.js`, `scene.css`: active JavaScript/WebGL listening desk. The page loads `scene.js` directly; no build selector or compiled application runtime is required. If WebGL is unavailable, the fallback links to the desktop preview. The retired CSS/photo view and its two product photographs are removed.
- `dev/music/index.html`: desktop-only development view, also available through Graphics → Desktop only. It uses the same `music/player.js` / `player.css` as the 3D laptop; do not fork the player. `?album=momento`, `?album=the-complete-scottish-bagpipe-collection` and `?album=none` select preview states.
- `hardware.js`, `macbook-air.js`, `superdrive.js`, `discs.js`, `cd-shelf.js`, `case-journey.js`: procedural hardware, real case opening and staged CD movement; `physical-scale.js` owns common dimensions.
- `projection.js`, `screen-aperture.js`, `camera-fit.js`, `camera-flight.js`, `display-quality.js`: desktop mapping, occlusion, framing, viewport transitions and native close-up sizing.
- `music/`: one shared desktop implementation for the 3D laptop and standalone preview: library state, provider transports/windows, draggable Music, nested menus, Help, jokes and panels. `scene.js` mounts `music/player.js` directly. Graphics and virtual System Settings share `graphics-settings.js`'s preference store, drawer and field controls.

## Shared desktop

`music/player.js`, `desktop-menu.js`, `desktop-panels.js`, `help-viewer.js`, `dialogs.js`, `system-settings.js`, window modules and their CSS are the canonical interface for the 3D laptop and desktop preview. Keep About windows, nested menu explanations, Help search/history, acknowledgements, traffic lights, dock recovery and provider notices in these shared modules.

The Graphics drawer and System Settings use one validated preference store. Music Settings remains a visit-only simulation; Import Settings saves catalogue-flow choices, never encoded audio. Desktop changes must retain live provider frames and imports rather than remount the player.

## Current catalogue

`music/catalogue.js` supplies the 3D desk and standalone desktop through `scene-catalogue.js` where needed: **nine albums, 324 track entries**. Preserve catalogue/track IDs and each case's own artwork.

| Album | Tracks | Playback source |
| --- | ---: | --- |
| Momento — Dave Milligan | 7 | Bandcamp |
| Portraits — Simon Thoumire and Dave Milligan | 11 | SoundCloud |
| Still As Your Sleeping — Karine Polwart & Dave Milligan | 10 | Bandcamp |
| Frieren: Beyond Journey's End (Original Soundtrack) — Evan Call | 70 | SoundCloud |
| Without Fear (The Complete Edition) — Dermot Kennedy | 21 | SoundCloud |
| Sonder (2023) — Dermot Kennedy | 12 | SoundCloud |
| The Complete Scottish Bagpipe Collection — Various Artists | 35 | Apple catalogue; 5 individual SoundCloud matches |
| Clair Obscur: Expedition 33 (Original Soundtrack) — Lorien Testard | 154 | SoundCloud |
| I've told the trees everything — Dermot Kennedy | 4 | SoundCloud |

The six invented albums in `music/collection.js` and their SVG covers remain archived test fixtures, excluded from production imports. Forss/Flickermood is a preview-only connection diagnostic. Do not substitute unrelated recordings for missing sources; The Sims Piano has no verified complete source.

## Storage and preservation

| Origin-local key | Contents |
| --- | --- |
| `atlasreid-music-import-library-v1` | Completed imported track IDs, timestamps, do-not-ask preference |
| `atlasreid-music-interface-v1` | Supported metadata edits, favourites and mock import preferences |
| `atlasreid-music-ui-preview-v1` | Separate desktop-preview import ledger |
| `atlasreid-music-ui-preview-interface-v1` | Separate desktop-preview interface state |
| `atlasreid-collection-graphics-v1` | Six validated graphics preferences shared across presentations/tabs |

Import saves catalogue entries, never audio or unfinished progress. Keep existing IDs/keys and hidden archived records; never clear unrelated storage. Preview reset clears only its two preview keys. Origins/browser profiles have separate libraries; Git does not transfer them. Storage failures fall back to the current visit. Music mutations merge fresh saved data while retaining failed local writes, unknown catalogue IDs and future-version records. Open desktop views refresh saved entries and preferences from storage without resetting playback, active imports or provider frames. Graphics patches merge fresh persisted state; subscriptions and cross-tab listeners must be disposed. Retired build preferences are ignored; do not clear unrelated browser storage.

## Interaction and rendering contracts

- Branding and the fixed, frosted collection panel are siblings of the animated scene shell. The world fills the viewport with a 360 px minimum; focused mode explicitly permits min-height 0. Empty title regions pass input to the world. Keep editable text selectable.
- The main-scene Atlas Reid wordmark links to `https://atlasreid.com/` in the same tab. Branding has a tighter vertical gap: wordmark 8 px lower/title 8 px higher, or 6 px each at small widths.
- The panel starts expanded each visit. Collapse hides its album navigation and credits while retaining the heading, Graphics icon and chevron. Keep `aria-expanded`, `aria-controls`, skip-link expansion and bounded small-screen scrolling. Hide the entire panel/branding in focus.
- The Graphics drawer keeps a separate mount outside the clipped glass panel; its header trigger, viewport anchoring, Escape/outside-click focus and compact-dialog hosting use one component. Apple → System Settings edits the same six real controls; Music → Settings remains a distinct visit-only replica, with the existing saved mock Import Settings.
- Music close stops/unloads playback without clearing the library; minimise preserves playback; maximise restores normal bounds when toggled. Dock/device icons reopen the same player. Move the whole desktop into/out of the compact dialog; preserve windows, focus and provider iframes.
- Keep nested Apple/Music/File/Edit/Song/View/Controls/Account/Window/Help menus, disabled Services, local navigable Help, About This Virtual Mac and TextEdit acknowledgements. Unsupported account/system commands stay local; never operate the real computer or native Music library.
- HTML sits beneath the alpha WebGL canvas and matching depth-writing aperture. Use `setScreenApertureActive()` to suppress/restore the black panel; never hide the parent screen mesh or raise HTML over moving physical media. Preserve foreground input occlusion and the separate scene-input route.
- Desk mode presents one screen-wide, keyboard-accessible desktop entry button over an inert desktop. A click opens the existing desktop without reopening closed Music; a drag still orbits. Native controls become interactive after the focus flight settles or in the compact dialog. The shared wallpaper is Atlas Reid's own train photograph toward Glasgow; dark menu text stays readable over its light sky.
- Moving/tilted views use exact perspective mapping. Settled desktop close-up uses native DOM (`transform:none`, CSS zoom), with logical widths 1024 Comfortable / 1280 Compact. Backing resolution is independent: Auto uses 1280 projected, native width in focus; manual 1280/1600/1920 remain available. Do not multiply CSS dimensions by devicePixelRatio.
- Projected desktop descendants disable backdrop filters and use tinted menu/transport/dock backgrounds. This avoids a known fragile 3D-transform/blur composition path; native focused, compact and standalone desktops keep their glass. The user's recurring checkerboard was reported only in Codex's browser, but was not consistently reproduced during diagnosis, so this is a targeted compatibility workaround rather than a proven root-cause fix. Temporary GPU sampling was removed; no extra render loop or per-frame readbacks remain.
- Focus/return flights last 1015/875 ms, with an 80 ms focus preparation hold. Delivered-frame timing, viewport FLIP cleanup and resize guards prevent jumps. Hide screen pills during flight; show the labelled Back to desk pill after settlement. Escape/compact Back restores the desk. Stationary pointer presses beginning and ending outside the laptop or compact dialog also return; desktop controls, bezel/padding clicks and drags stay inside. Ignore backdrop return during camera flights.
- Keep on-demand idle rendering and optional focused rest; camera/CD motion, resize and quality changes wake it. Auto WebGL caps DPR at 2; shadows default to 1024. Busy operations lock media/hover ownership, while camera input remains available. Never recreate the player or renderer merely to rest the scene.

## Geometry invariants

- Common scale: 4.05 units per 304.1 mm. Air footprint 304.1×215 mm, with an 11.3 mm closed-assembly reference; SuperDrive 139×139×17 mm; representative jewel cases 142×125 mm. Enclosure details/cable length are visual estimates; measure laptop footprints locally after yaw.
- Laptop yaw is +12° Y, anticlockwise from above; transform USB-C attachment, direction and rigid adapter parts with it. Preserve drive/slot placement, staged shelf clearance and table-case hover/return.
- The USB-A adapter housing rests on the table; USB-C and USB-A plugs insert into their mating openings with submillimetre white-housing seams. Rounded white housings and strain reliefs follow the supplied visual reference; connector dimensions remain estimates. Cable endpoints follow the actual housing/relief ends after yaw.
- Separate visible composition from conservative cable/CD-journey bounds. Perspective horizontal centering uses a stable base target; `fitDeskOrbit` chooses 0.82 of the conservative distance, clamped by a 1.035-padded visible fit. Manual zoom limits stay 0.62–1.4 of the conservative radius. Preserve displayed pan when interrupting a return flight until Reset view.
- Display aspect is 2560:1664. Upper corners are circular radius .045; lower corners remain square. Webcam radius .016 with 24 segments stays inside the notch. The cloned aperture and DOM projection share screen-local depth .0002 and source dimensions.
- Notch/lens use isolated, ordered polygon depth offsets to avoid display-aperture flicker at oblique distances; physical contour and input occlusion remain unchanged. Printed case artwork is the paper insert's only front face, with solid reverse/edges retained, avoiding nearly coplanar backing flicker through lid motion.
- CDs retain 120 mm diameter, 15 mm open centre hole and 1.2 mm substrate. Cover print diameter is 119.3 mm, leaving 0.35 mm radial margins; centred square-to-circle UV crop reuses the case texture. Keep the silver underside and avoid broad reflective/hub overlays over the printed face.

## Provider limits

SoundCloud and Bandcamp connect only after Continue in the first-play notice, once per album per visit. Keep validated URLs, visible native branding/credits and source links. Do not copy/cache/proxy audio or use undocumented provider messages. Availability depends on service, account, region and browser; complete metadata does not promise full playback. Frieren's full-duration catalogue includes guest SNIP/Go+ previews.

SoundCloud uses the official Widget API and one live iframe across stacking/minimising. Closing its window pauses; destroyed transports require a fresh iframe because the API caches by contentWindow. Retain `encrypted-media` delegation to `https://w.soundcloud.com`; keep provider “Hear more” overlays and stable Play/Pause/mute SVG nodes. Report actual errors without inventing DRM diagnoses.

Bandcamp uses official album/track embeds. Native controls own playback/tracklist; Music cannot observe elapsed time or playing state and disables remote seek/volume/queue/shuffle/repeat. Background/minimise preserves the frame; Stop, close, eject or provider switch unloads it.

The bagpipe album's five SoundCloud entries match performer/title/duration from another compilation; identical recordings/mastering are unconfirmed. Keep per-track routing with no playlist fallback. The other 30 entries show Apple Music/listening links, never a demo clock; changing to one stops/unloads hosted playback. Apple Music is an external link, with no API/player integration. There is no real CD ripping, offline audio, cloud sync or arbitrary URL importer.

## Verification and remaining limits

The 12 November simplification restores one JavaScript application while retaining the grounded/seated USB adapter, screen-wide click/tap and keyboard desktop entry, outside-click return, original Music/Help content, centred SVG controls and saved-library improvements. **All 20 check suites pass**, including **14 hardware scale checks**, **17 graphics settings checks**, **16 import-library checks**, **14 interface-state checks**, and **19 standalone site checks over 78 runtime files**. Direct scene startup, repository-prefix hosting, retired runtime URLs returning 404, legacy build links serving the normal entry, syntax and whitespace checks pass. Browser QA verified direct `scene.js` startup, no Build controls in Graphics or System Settings, existing 1920/Compact display preferences retained, screen-click and keyboard entry, outside-click return and a closed Music window remaining closed on re-entry. Physical-touch and audible-output verification remain separate.

The retained library checks cover fresh-storage merges, late-arriving future schemas, unknown IDs, failed-write recovery and preview namespace isolation. Window/transport checks preserve iframe identity, close/minimise/maximise behaviour and media state. Geometry contracts cover the hardware, seated adapters and cable joins, nine-case separation/journeys, projection/aperture contours, full-face artwork and composition fit. Preserve on-demand rendering and the embedded-browser compositing workaround. Numerical checks are not GPU or physical-touch proof.

Earlier desktop QA verified the original Help welcome, subscription articles, search/history and Escape/focus restoration, Music Settings tabs, disabled Services, About Music and the virtual TextEdit acknowledgements. Bandcamp remained loaded when Music was minimised and unloaded on provider close. Current phone-size layout still needs a browser pass; the last in-app viewport attempt stayed at 747 px instead of the requested 390 px, and its temporary override was reset.

Earlier provider checks found that some SoundCloud tracks worked in Chrome but stalled in the in-app browser. Do not generalise one working track to an entire catalogue or browser. Physical-phone/touch, exhaustive interruption/reduced-motion combinations and full assistive-technology coverage remain incompletely verified.

Preserve [credits and notices](../credits.html), [asset provenance](ASSETS.md), the complete bundled Three.js MIT licence and [downloadable acknowledgements](../music/acknowledgements.rtf). No open-source licence has been selected for the application/original assets. Attribution, source availability and embedded players do not establish publication permission for third-party music, artwork, photographs or marks. Inspect Git/hosting state separately; source publication does not itself enable Pages or change domain/DNS configuration.
