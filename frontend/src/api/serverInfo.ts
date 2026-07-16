import { createSignal } from 'solid-js';
import { graphqlFetch } from './graphql';
import { IsCentralServer } from './initialisation.generated';

// Server role for the phase-visibility matrix (spec/sync-modal/rules.md
// § phase visibility). Fetched once per startup pass — unauthenticated, so it
// works pre-initialisation and pre-login alike. False until known (the remote
// site is the common case; the current app's client defaults the same way
// while loading). `background` keeps a failed probe out of the global
// unexpected-error modal; the default stands until the next startup pass.
const [isCentralServer, setIsCentralServer] = createSignal(false);

export { isCentralServer };

export const fetchServerInfo = async (): Promise<void> => {
  const result = await graphqlFetch(IsCentralServer, {}, { background: true });
  if (result.kind === 'success')
    setIsCentralServer(result.data.isCentralServer);
};
