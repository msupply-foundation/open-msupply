import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadFile } from './postFiles';

// The shared `/upload` helper, used by report install, plugin install and
// central data import. The signed-out cases are spec/plugin-management's
// (OMS-REG-MNG-07), the route being the same for every caller.

const reportUnauthenticated = vi.fn();
vi.mock('@/auth/authContext', () => ({
  reportUnauthenticated: () => reportUnauthenticated(),
}));

describe('uploadFile', () => {
  beforeEach(() => reportUnauthenticated.mockReset());
  afterEach(() => vi.unstubAllGlobals());

  const answer = (body: string, status: number, statusText = '') =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body, { status, statusText }))
    );
  const file = () => new File(['x'], 'units.xlsx');

  it('sends the file as the one "files" part and answers the hyphenated file-id', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ 'file-id': 'abc' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await uploadFile(file())).toEqual({
      kind: 'uploaded',
      fileId: 'abc',
    });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect((init?.body as FormData).getAll('files')).toHaveLength(1);
  });

  it("OMS-REG-MNG-07.4, .64 — an unauthenticated 500 fails with the server's reason and reports the session ended", async () => {
    answer('You need to be logged in', 500, 'Internal Server Error');
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: '500 Internal Server Error: You need to be logged in',
    });
    expect(reportUnauthenticated).toHaveBeenCalledOnce();
  });

  it('OMS-REG-MNG-07.64 — a 401 is read as signed out too', async () => {
    answer('', 401, 'Unauthorized');
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: '401 Unauthorized',
    });
    expect(reportUnauthenticated).toHaveBeenCalledOnce();
  });

  it('any other failure keeps the session, and a long or HTML body stays out of the message', async () => {
    answer('<html><body>Bad gateway</body></html>', 502, 'Bad Gateway');
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: '502 Bad Gateway',
    });
    answer('x'.repeat(201), 500, 'Internal Server Error');
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: '500 Internal Server Error',
    });
    expect(reportUnauthenticated).not.toHaveBeenCalled();
  });

  it('fails a 200 with no file-id, or one that is not JSON', async () => {
    answer(JSON.stringify({ file_id: 'abc' }), 200); // eslint-disable-line camelcase
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: '200 — no file id',
    });
    answer('<html>', 200);
    expect((await uploadFile(file())).kind).toBe('failed');
  });

  it('fails when the server is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    expect(await uploadFile(file())).toEqual({
      kind: 'failed',
      message: 'Failed to fetch',
    });
  });
});
