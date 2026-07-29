import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from './graphql';
import { IsCentralServer, ServerVersion } from './initialisation.generated';
import { fetchServerInfo, isCentralServer, serverVersion } from './serverInfo';

// The startup server-info pass (spec/startup/rules.md § App version, OMS-REG-LGN-01.19/.20):
// the version signal stays unknown when the probe fails — which is every
// server predating open-msupply#12566, where the serverVersion field doesn't
// exist and the query errors — and a failed version probe never disturbs the
// role read. graphqlFetch is mocked at the module seam; signals are
// module-global, so the unknown case runs before the one that sets a version.

vi.mock('./graphql', () => ({
  graphqlFetch: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

const respond = (role: unknown, version: unknown) =>
  fetchMock.mockImplementation(
    async doc => (doc === IsCentralServer ? role : version) as never
  );

beforeEach(() => fetchMock.mockReset());

describe('fetchServerInfo', () => {
  it('a failed version probe (e.g. a server without the field) leaves the version unknown and the role intact', async () => {
    respond(
      { kind: 'success', data: { isCentralServer: true } },
      { kind: 'unexpectedError' }
    );
    await fetchServerInfo();
    expect(serverVersion()).toBeUndefined();
    expect(isCentralServer()).toBe(true);
  });

  it('OMS-REG-LGN-01.19: a reported server version lands on the signal, probed in the background', async () => {
    respond(
      { kind: 'success', data: { isCentralServer: false } },
      { kind: 'success', data: { serverVersion: '3.00.00-RC' } }
    );
    await fetchServerInfo();
    expect(serverVersion()).toBe('3.00.00-RC');
    expect(fetchMock).toHaveBeenCalledWith(
      ServerVersion,
      {},
      { background: true }
    );
  });
});
