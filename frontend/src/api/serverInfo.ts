import { createSignal } from 'solid-js';
import { parseBuildVersion } from '../appUpdate';
import { graphqlFetch } from './graphql';
import { IsCentralServer, ServerVersion } from './initialisation.generated';

// Server role for the phase-visibility matrix (spec/sync-modal/rules.md
// § phase visibility). Fetched once per startup pass — unauthenticated, so it
// works pre-initialisation and pre-login alike. False until known (the remote
// site is the common case; the current app's client defaults the same way
// while loading). `background` keeps a failed probe out of the global
// unexpected-error modal; the default stands until the next startup pass.
const [isCentralServer, setIsCentralServer] = createSignal(false);

export { isCentralServer };

// The server's version for the pre-session footers (spec/startup/rules.md
// § App version): undefined until known, and a failed fetch leaves it so —
// the footers just omit the line. Servers predating open-msupply#12566 lack
// the field entirely (the version-dependence note in spec/startup/contract.md
// § App version), so against them the probe fails and the version stays
// unknown.
const [serverVersion, setServerVersion] = createSignal<string | undefined>(
  undefined
);

export { serverVersion };

// Whether the server reports a version other than the running build's (issue
// #574). While front end and server release on one version line, naming both
// is noise — the version surfaces show a single "Version" line and only split
// into Interface / Server when they genuinely disagree. Compared on the
// release tag (parseBuildVersion drops the commit stamp), ignoring the tag's
// leading "v" and case: a release build "v3.04.00 (2ae7bd2)" matches a server
// "3.04.00". Unknown server version ⇒ no disagreement to show.
const normaliseVersion = (version: string): string =>
  version.trim().replace(/^v/i, '').toLowerCase();

export const versionsMatch = (
  buildVersion: string,
  server: string | undefined
): boolean =>
  server === undefined ||
  normaliseVersion(parseBuildVersion(buildVersion).tag) ===
    normaliseVersion(server);

export const serverVersionDiffers = (): boolean =>
  !versionsMatch(APP_VERSION, serverVersion());

export const fetchServerInfo = async (): Promise<void> => {
  const [role, version] = await Promise.all([
    graphqlFetch(IsCentralServer, {}, { background: true }),
    graphqlFetch(ServerVersion, {}, { background: true }),
  ]);
  if (role.kind === 'success') setIsCentralServer(role.data.isCentralServer);
  if (version.kind === 'success') setServerVersion(version.data.serverVersion);
};
