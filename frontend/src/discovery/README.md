# Discovery — the shells' bundled pre-server page

The implementation of the client-mode half of **[`spec/desktop/`](../../spec/desktop/README.md)** that lives in this repo: the **server discovery page** (issue #172 › "Page code") — the one screen of the product that cannot be served by a server, because it runs before a server has been chosen. Everything after a successful connection (initialisation status, auth, the app itself) is served by the connected server, exactly as the spec's § switching servers requires. Both shells host the same page: the Electron desktop shell and the Android app's client mode.

## What's here vs what a host owns

This directory builds the **page**; a shell hosts it. The contract is deliberately asymmetric — hosts provide primitive facts and inherently-native capabilities, the page owns every decision — so the two hosts cannot drift apart on behaviour:

| a host (shell)                                                                                                                                | this page                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| browse mDNS announcements (`_omsupply._tcp`) and hand them over **verbatim** (`announcements()`)                                             | filter incomplete ones (AC-DT7), accumulate + dedupe (AC-DT5, 8), bounded not-found outcome, search again (AC-DT9–11)                                                                     |
| state facts: `platform`, this machine's `hardwareId` (same derivation as the server's announced id), reachable `lanAddresses` (`hostInfo()`) | mark this machine's server by **hardware id, never address** (spec/android § server discovery) and rewrite its address to a reachable one (AC-DT21/22) — `discovery.ts § toFrontEndHost` |
| answer `probe(url, timeoutMs)` — the trust-all bounded answer check the page's own fetch cannot do (release CORS, self-signed TLS)           | the connection's ordering: probe → record → navigate (`discovery.ts § connectToServer`), stay on a failed choice, tell the user (AC-DT12, 14)                                            |
| `navigate(url)` — plain navigation, nothing else                                                                                              | remember only **successful** connections (AC-DT1, 13–15), decide the auto-connection (remembered server, or the standalone install's own, AC-DT20)                                        |
| launch: navigate straight to the page (client) or with `?standalone=true`; the **host duties** below                                         | read the launch flags, never bounce back (AC-DT2, 16)                                                                                                                                     |

**Host duties** (non-callable contract obligations, [`hostContract.ts`](./hostContract.ts)) — each host implements these natively, and a new host must too:

- **Failed main-frame load → this page, flagged** (AC-DT4): a connected server that answered the probe but fails to serve its UI must land back here with `?autoconnect=false&timedout=true` (+`&standalone=true` when launched standalone), never on shell/browser error content — with a self-loop guard when the discovery page's own origin is what failed.
- **The session ends with the app** (AC-DT18).
- **Back-stack pinning** where the platform has a back gesture: Android's `navigate` clears WebView history once the destination commits, so hardware-back cannot re-enter this page without its flags (AC-DT16).

The files:

- **[`hostContract.ts`](./hostContract.ts)** — the contract: `HostInfo`, `RawAnnouncement`, `DiscoveryHostApi`, and the host duties. Types only, no imports. Resolved once per page-load by [`src/platform/discoveryHost.ts`](../platform/discoveryHost.ts) (`getDiscoveryHost()`): an injected `window.discoveryHostApi` (Electron preload, dev mock) wins, else the Android Capacitor plugin, else no host. This retires wire-compatibility with the legacy shell's `electronNativeAPI` — its fused check-and-navigate dropped the login hand-off (AC-DT23/24), never seeded `?timedout=true`, and marked locality by address compare; the primitive contract makes those divergences unrepresentable.
- **[`discovery.ts`](./discovery.ts)** — every decision as pure functions (announcement completeness, locality + address rewriting, list merge, manual-URL parse, launch flags, auto-connect target, the remembered server, probe/connect URLs, the connect ordering), unit-tested against the `AC-DT*` criteria in [`discovery.test.ts`](./discovery.test.ts).
- **[`DiscoveryPage.tsx`](./DiscoveryPage.tsx)** — the screen, constructed against a resolved host: the shared boot-screen frame (`LoginInitLayout`), one standalone/chooser mode fork, and `NoHostPage` for a shell-less tab.
- **[`entry.tsx`](./entry.tsx)** + `/discovery.html` — a **second page of the app build** (`vite.config.ts` input map; one module graph, shared chunks — `kdd/bundling` § Second entry). `pnpm build` emits `dist/discovery.html` beside the app; shells load it from there — the Electron shell and Android client mode (with Electron packaging pruning the page's transitive slice of `dist/` via the build manifest) live in the shells PR. In dev, `pnpm dev` serves `/discovery.html` with a mocked host ([`devHostMock.ts`](./devHostMock.ts)): `?mock=none` for the not-found outcome, `?mock=fail` for failed choices, plus the page's own real flags (`?standalone=true`, `?timedout=true`, `?autoconnect=false`).
- **[`discoveryReturn.ts`](./discoveryReturn.ts)** — the hand-off's return path, read by the app's login/initialisation screens; a leaf module, the only discovery code in the served app's graph (`kdd/bundle-size-by-pr.md`).

## Deliberate departures from the legacy shell's screen

Both are gaps the spec capture names rather than behaviours it requires (spec/desktop/README.md § Status):

- **Remember on success, not at choice** — the legacy screen records a server the moment it is chosen, so one that never connected can be auto-attempted forever. This page records only after the host's answer check passes — and records *before* asking the host to navigate, so no host needs a grace delay for the page to persist under teardown.
- **One remembered server, not two** — the legacy screen keeps a separate `manualServer` that beats any later list choice. Here the remembered server is simply the **last successful connection**, chosen or entered alike (spec § server selection). The storage key (`preference/previousServer`) is the legacy shell's, so an upgrade keeps its remembered server.
- **Standalone never falls back to the list** — the spec's MUST (§ standalone auto-connection): an unanswering own-server is a stated error with a retry, not a server chooser the install was never meant to offer. (The legacy shell shows the list; the spec carries that as its ⚠️ VERIFY open question.)
