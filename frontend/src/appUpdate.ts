import { createSignal } from 'solid-js';
import { SYNC_INDICATOR_REFRESH_MS, VERSION_URL } from './config';

// Spec (chrome § update prompt, issue #925): front-end sync swaps the served
// bundle under a running client without a restart, and it deliberately keeps
// the previous bundle's assets resolvable — so staleBundle.ts's preload-error
// detector (a chunk 404ing) never fires. The only signal is the served
// release manifest: /VERSION.txt names the ACTIVE bundle's version, while the
// baked-in APP_VERSION names the running build's. When they stop agreeing,
// the shell's bottom bar offers — never forces — a reload.
//
// Deliberately a DIFFERENT surface from staleBundle's blocking modal: here
// nothing is broken — the app works, it's merely outdated — so the prompt is
// a quiet, persistent footer cell behind a confirm, and the only thing that
// could cost the user work is a reload they didn't choose. staleBundle stays
// the recovery path for a bundle that genuinely vanished.
//
// Comparison parses, never string-equates (spec/startup/contract.md § App
// version): the manifest's `version:` line is the bare release tag
// ("v0.0.82") while a release APP_VERSION appends the short commit stamp
// ("v0.0.82 (2ae7bd2)"), and the manifest's `commit:` is the FULL sha. Same
// build ⇒ tags equal and the full sha extends the short stamp; a re-published
// tag with a different commit still counts as a change. Anything unparseable
// — a 404, an SPA fallback answering with index.html, a dev server — is "no
// signal", never "changed".

const [updateAvailable, setUpdateAvailable] = createSignal(false);
export { updateAvailable };

export const reloadForUpdate = (): void => {
  location.reload();
};

type BundleVersion = { tag: string; commit?: string };

// The release pipeline's manifest: "version: <tag>" / "package: <semver>" /
// "commit: <full sha>", one per line (kdd/build-release-pipeline).
export const parseVersionManifest = (
  text: string
): BundleVersion | undefined => {
  const tag = /^version:[ \t]*(\S+)[ \t]*$/m.exec(text)?.[1];
  if (tag === undefined) return undefined;
  const commit = /^commit:[ \t]*([0-9a-f]+)[ \t]*$/im.exec(text)?.[1];
  return { tag, commit };
};

// APP_VERSION: "<tag> (<short sha>)" from a pipeline release; any other build
// is a git-describe string (or bare package version) with no commit stamp.
export const parseBuildVersion = (appVersion: string): BundleVersion => {
  const release = /^(\S+) \(([0-9a-f]+)\)$/i.exec(appVersion);
  return release
    ? { tag: release[1], commit: release[2] }
    : { tag: appVersion };
};

export const versionsDiffer = (
  served: BundleVersion,
  build: BundleVersion
): boolean =>
  served.tag !== build.tag ||
  (served.commit !== undefined &&
    build.commit !== undefined &&
    !served.commit.toLowerCase().startsWith(build.commit.toLowerCase()));

// One poll: read the served manifest and settle the signal BOTH ways when it
// parses (a rolled-back deploy withdraws the prompt); a no-signal read leaves
// the last answer standing rather than clearing a real prompt on a transient
// outage. Never throws — a version probe must never trip the global modal.
export const checkServedVersion = async (): Promise<void> => {
  try {
    // no-store: the manifest keeps the same URL across bundles, and servers
    // predating open-msupply#12634 serve it with a year-long max-age — the
    // HTTP cache must not be allowed to answer.
    const response = await fetch(VERSION_URL, { cache: 'no-store' });
    if (!response.ok) return;
    const served = parseVersionManifest(await response.text());
    if (!served) return;
    setUpdateAvailable(versionsDiffer(served, parseBuildVersion(APP_VERSION)));
  } catch {
    // Offline / server down — no signal; the next tick tries again.
  }
};

// Called once from App.tsx's onMount (mirroring startStaleBundleWatch), so
// importing this module never touches the network on its own. Dev is a strict
// no-op (spec/chrome § update prompt): /VERSION.txt isn't proxied — vite
// would answer with a 404 or the SPA fallback — dev's APP_VERSION is a
// git-describe string no manifest ever matches, and HMR already owns updates
// there; polling could only produce noise or a permanently-lit prompt (the
// same posture as intl/dictionaryCache disabling itself in dev).
export const startUpdateWatch = (): (() => void) => {
  if (import.meta.env.DEV) return () => {};
  void checkServedVersion();
  // Piggybacks the sync indicator's minutely cadence (spec/chrome § update
  // prompt: "about minutely") rather than minting another interval constant.
  const timer = setInterval(
    () => void checkServedVersion(),
    SYNC_INDICATOR_REFRESH_MS
  );
  return () => clearInterval(timer);
};
