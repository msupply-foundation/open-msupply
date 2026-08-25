# Desktop — the shell's bundled discovery page

The implementation of the client-mode half of **[`spec/desktop/`](../../spec/desktop/README.md)** that lives in this repo: the **server discovery page** (issue #172 › "Page code") — the one screen of the product that cannot be served by a server, because it runs before a server has been chosen. Everything after a successful connection (initialisation status, auth, the app itself) is served by the connected server, exactly as the spec's § switching servers requires.

## What's here vs what the shell owns

This repo builds the **page**; a desktop shell (not in this repo — build mechanics are deliberately out of spec) hosts it. The split, with the contract each side codes against:

| the shell (host)                                                                                                                                      | this page                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| browse mDNS announcements (`_omsupply._tcp`), filter incomplete ones, mark/rewrite a local server's address (AC-DT21/22)                              | accumulate + dedupe the list, bounded not-found outcome, search again (AC-DT5, 7–11)                                                             |
| answer `connectToServer` — check the server answers, then navigate the window (AC-DT4, 12)                                                            | choose / manual entry, stay on a failed choice, tell the user (AC-DT12, 14)                                                                      |
| launch: navigate straight to the page (client) or with `?standalone=true`; append `?autoconnect=false` / `?timedout=true` when returning (AC-DT2, 16) | decide the auto-connection (remembered server, or the standalone install's own) and remember only **successful** connections (AC-DT1, 13–15, 20) |

- **[`hostBridge.ts`](./hostBridge.ts)** — the typed bridge (`window.electronNativeAPI`), wire-compatible with the current shell's preload (open-msupply `client/packages/electron/src/preload.ts`). Two shell changes remain before the existing Electron shell satisfies the whole table (both already honoured by the Android host): its `connectToServer` drops `path` when navigating, which carries the login hand-off (AC-DT23/24); and it never appends `?timedout=true`, which seeds the could-not-connect notice (AC-DT2). Everything else in the table it already does.
- **[`discovery.ts`](./discovery.ts)** — the page's decisions as pure functions (announcement completeness, list merge, manual-URL parse, launch flags, auto-connect target, the remembered server), unit-tested against the `AC-DT*` criteria in [`discovery.test.ts`](./discovery.test.ts).
- **[`DiscoveryPage.tsx`](./DiscoveryPage.tsx)** — the screen, composed from the shared boot-screen shell (`LoginInitLayout`) and the UI library.
- **[`entry.tsx`](./entry.tsx)** + `/discovery.html` + `vite.discovery.config.ts` — a standalone build (`pnpm build:discovery` → `dist-discovery/`), separate from the app bundle so the served app's chunk graph is untouched; the shell loads the emitted directory. In dev, `pnpm dev` serves `/discovery.html` with a mocked bridge ([`devHostMock.ts`](./devHostMock.ts)): `?mock=none` for the not-found outcome, `?mock=fail` for failed choices, plus the page's own real flags (`?standalone=true`, `?timedout=true`, `?autoconnect=false`).

## Deliberate departures from the current shell's screen

Both are gaps the spec capture names rather than behaviours it requires (spec/desktop/README.md § Status):

- **Remember on success, not at choice** — the current screen records a server the moment it is chosen, so one that never connected can be auto-attempted forever. This page records only after the host's answer check passes.
- **One remembered server, not two** — the current screen keeps a separate `manualServer` that beats any later list choice. Here the remembered server is simply the **last successful connection**, chosen or entered alike (spec § server selection). The storage key (`preference/previousServer`) is the current shell's, so an upgrade keeps its remembered server.
- **Standalone never falls back to the list** — the spec's MUST (§ standalone auto-connection): an unanswering own-server is a stated error with a retry, not a server chooser the install was never meant to offer. (The current shell shows the list; the spec carries that as its ⚠️ VERIFY open question.)
