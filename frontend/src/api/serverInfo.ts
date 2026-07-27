import { createSignal } from 'solid-js';
import { graphqlFetch } from './graphql';
import { ApiVersion, IsCentralServer } from './initialisation.generated';

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
// the footers just omit the line. Servers predating open-msupply#12566 report
// the meaningless `0.1.0` (their graphql-general crate version, the wire trap
// in spec/startup/contract.md § App version) — treated as unknown.
const [serverVersion, setServerVersion] = createSignal<string | undefined>(
  undefined
);

export { serverVersion };

export const fetchServerInfo = async (): Promise<void> => {
  const [role, version] = await Promise.all([
    graphqlFetch(IsCentralServer, {}, { background: true }),
    graphqlFetch(ApiVersion, {}, { background: true }),
  ]);
  if (role.kind === 'success') setIsCentralServer(role.data.isCentralServer);
  if (version.kind === 'success' && version.data.apiVersion !== '0.1.0')
    setServerVersion(version.data.apiVersion);
};
