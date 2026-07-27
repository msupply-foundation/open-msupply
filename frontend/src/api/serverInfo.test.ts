import { beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlFetch } from './graphql';
import { ApiVersion, IsCentralServer } from './initialisation.generated';
import { fetchServerInfo, isCentralServer, serverVersion } from './serverInfo';

// The startup server-info pass (spec/startup/rules.md § App version, AC-VN2;
// the 0.1.0 wire trap in spec/startup/contract.md): the version signal stays
// unknown on failure and on the meaningless crate-version response, and a
// failed version probe never disturbs the role read. graphqlFetch is mocked
// at the module seam; signals are module-global, so the unknown cases run
// before the one that sets a version.

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
  it('a failed version probe leaves the version unknown and the role intact', async () => {
    respond(
      { kind: 'success', data: { isCentralServer: true } },
      { kind: 'unexpectedError' }
    );
    await fetchServerInfo();
    expect(serverVersion()).toBeUndefined();
    expect(isCentralServer()).toBe(true);
  });

  it('treats the pre-fix crate version 0.1.0 as unknown (contract wire trap)', async () => {
    respond(
      { kind: 'success', data: { isCentralServer: false } },
      { kind: 'success', data: { apiVersion: '0.1.0' } }
    );
    await fetchServerInfo();
    expect(serverVersion()).toBeUndefined();
  });

  it('AC-VN2: a reported server version lands on the signal, probed in the background', async () => {
    respond(
      { kind: 'success', data: { isCentralServer: false } },
      { kind: 'success', data: { apiVersion: '3.00.00-RC' } }
    );
    await fetchServerInfo();
    expect(serverVersion()).toBe('3.00.00-RC');
    expect(fetchMock).toHaveBeenCalledWith(
      ApiVersion,
      {},
      { background: true }
    );
  });
});
