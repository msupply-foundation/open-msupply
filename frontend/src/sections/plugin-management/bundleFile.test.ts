import { afterEach, describe, expect, it, vi } from 'vitest';
import { partitionFiles } from '@/ui/elements/inputs/uploadFiles';
import {
  BUNDLE_ACCEPT,
  chooseBundle,
  MAX_BUNDLE_BYTES,
  uploadBundle,
} from './bundleFile';

// spec/plugin-management/acceptance.md › installing (the file choice) and
// › access (the upload route)

const fileLike = (name: string, size = 10) => ({
  name,
  type: name.endsWith('.json') ? 'application/json' : 'text/plain',
  size,
});

// What one pick or drop decides: the upload zone's partition, then the choice.
const choose = (...files: ReturnType<typeof fileLike>[]) => {
  const { accepted, rejected } = partitionFiles(files, {
    accept: BUNDLE_ACCEPT,
    maxSize: MAX_BUNDLE_BYTES,
  });
  return chooseBundle(accepted, rejected);
};

describe('AC-I2 — a file not named .json is refused', () => {
  it('refuses it as an invalid type', () => {
    const choice = choose(fileLike('plugin.txt'));
    expect(choice.kind).toBe('refused');
    expect(choice.kind === 'refused' && choice.rejection.reason).toBe('type');
  });
});

describe('AC-I3 — .json in any letter case is accepted', () => {
  it('chooses BUNDLE.JSON', () => {
    const choice = choose({ name: 'BUNDLE.JSON', type: '', size: 10 });
    expect(choice.kind).toBe('chosen');
  });
});

describe('AC-I14 — a file over 50 MB is refused before sending', () => {
  it('refuses 50 MB + 1 byte as too large, and chooses 50 MB exactly', () => {
    const over = choose(fileLike('big.json', MAX_BUNDLE_BYTES + 1));
    expect(over.kind === 'refused' && over.rejection.reason).toBe('size');
    expect(choose(fileLike('edge.json', MAX_BUNDLE_BYTES)).kind).toBe('chosen');
  });
});

describe('AC-I15 — a drop of several files chooses none', () => {
  it('chooses none for two bundles', () => {
    expect(choose(fileLike('a.json'), fileLike('b.json')).kind).toBe('none');
  });

  it('chooses none for a bundle beside a refused file, and says nothing', () => {
    expect(choose(fileLike('a.json'), fileLike('x.txt')).kind).toBe('none');
  });
});

describe('uploadBundle — the staged upload (contract › file upload)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the file as the one "files" part and answers its file id', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(JSON.stringify({ 'file-id': 'abc' }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['{}'], 'bundle.json');
    expect(await uploadBundle(file)).toEqual({ ok: true, fileId: 'abc' });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect((init?.body as FormData).getAll('files')).toHaveLength(1);
  });

  it('AC-A4 — an unauthenticated 500 is a failed upload named by its status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('You need to be logged in', {
            status: 500,
            statusText: 'Internal Server Error',
          })
      )
    );
    expect(await uploadBundle(new File(['{}'], 'b.json'))).toEqual({
      ok: false,
      status: '500 Internal Server Error',
    });
  });

  it('treats a 200 without a file id as a failed upload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 }))
    );
    const result = await uploadBundle(new File(['{}'], 'b.json'));
    expect(result.ok).toBe(false);
  });
});
