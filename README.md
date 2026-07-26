# MCP Stream Overlay v3.3 — OBS Sync Patch

The original v3.3 synchronized through browser storage and BroadcastChannel.
Normal browser tabs share those, but OBS Browser Source uses a separate Chromium
profile and therefore stayed at its own default state.

This patch keeps the v3.3 interface and adds a tiny live relay inside Vite.
No Electron and no extra dependency are required.

## Start

Double-click `START_OVERLAY.bat`.

Control panel:

`http://127.0.0.1:5173/`

OBS Browser Source:

`http://127.0.0.1:5173/overlay`

Use 1920 × 1080 in OBS. After changing the URL, click
**Refresh cache of current page** once.


## v3.7 additions
- Added a Tactics Scale slider (50%–150%) beneath Roster Scale.
- Both Team Tactics panels resize live while remaining anchored to the bottom corners.
