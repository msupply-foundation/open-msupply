import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearUnexpectedError,
  graphqlFetch,
  unexpectedError,
  type TypedDocument,
} from './graphql';
import { clearUnauthenticated, unauthenticated } from '../auth/authContext';

type Result = { thing: { id: string } };
const document: TypedDocument<Result, Record<string, never>> = {
  query: 'query thing { thing { id } }',
};

const mockFetch = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearUnexpectedError();
  clearUnauthenticated();
});

describe('graphqlFetch', () => {
  it('posts the document and returns a success result', async () => {
    const fetchMock = mockFetch({ data: { thing: { id: '1' } } });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'success', data: { thing: { id: '1' } } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/graphql');
    expect(JSON.parse(String(init.body))).toEqual({
      query: document.query,
      variables: {},
    });
    // Auth is cookie-based: same-origin credentials, no token headers.
    expect(init.credentials).toBe('same-origin');
  });

  it('treats GraphQL errors as unexpectedError by default, description on the signal', async () => {
    mockFetch({
      data: null,
      errors: [{ message: 'Something failed' }, { message: 'Also this' }],
    });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'unexpectedError' });
    expect(unexpectedError()).toBe('Something failed, Also this');
  });

  it('surfaces extensions.details in the description when it adds detail', async () => {
    mockFetch({
      data: null,
      errors: [
        { message: 'Bad user input', extensions: { details: 'DatabaseError("connection reset")' } },
        // details equal to the message add nothing → not repeated.
        { message: 'Plain', extensions: { details: 'Plain' } },
        // non-string / empty details are ignored → bare message.
        { message: 'NoDetail', extensions: { code: 500 } },
      ],
    });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'unexpectedError' });
    expect(unexpectedError()).toBe(
      'Bad user input: DatabaseError("connection reset"), Plain, NoDetail'
    );
  });

  it('returns graphqlError without tripping the global signal when opted in', async () => {
    mockFetch({ data: null, errors: [{ message: 'Something failed' }] });
    const result = await graphqlFetch(
      document,
      {},
      { returnGraphqlErrors: true }
    );
    expect(result).toEqual({
      kind: 'graphqlError',
      message: 'Something failed',
      errors: [{ message: 'Something failed' }],
    });
    expect(unexpectedError()).toBeUndefined();
  });

  it('returns unexpectedError on non-200 responses', async () => {
    mockFetch({}, false, 500);
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toBe('HTTP 500');
  });

  it('returns unexpectedError when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network down'))
    );
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toBe('Network down');
  });

  it('returns unexpectedError when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      })
    );
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toBe('Unexpected token < in JSON');
  });

  it('returns unexpectedError when the body has neither data nor errors', async () => {
    mockFetch({});
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toBe(
      'Response contained neither data nor errors'
    );
  });

  it('promotes a mapped success payload to unexpectedError, description on the signal', async () => {
    mockFetch({ data: { thing: { id: 'bad' } } });
    const result = await graphqlFetch(
      document,
      {},
      {
        mapSuccessToError: data =>
          data.thing.id === 'bad' ? 'Record does not exist' : undefined,
      }
    );
    expect(result).toEqual({ kind: 'unexpectedError' });
    expect(unexpectedError()).toBe('Record does not exist');
  });

  it('passes success through when the mapper returns undefined', async () => {
    mockFetch({ data: { thing: { id: 'ok' } } });
    const result = await graphqlFetch(
      document,
      {},
      {
        mapSuccessToError: data =>
          data.thing.id === 'bad' ? 'Record does not exist' : undefined,
      }
    );
    expect(result).toEqual({ kind: 'success', data: { thing: { id: 'ok' } } });
    expect(unexpectedError()).toBeUndefined();
  });

  it('returns unauthenticated, sets its signal, and leaves unexpectedError unset', async () => {
    mockFetch({ data: null, errors: [{ message: 'Unauthenticated' }] });
    expect(unauthenticated()).toBe(false);
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'unauthenticated' });
    expect(unauthenticated()).toBe(true);
    expect(unexpectedError()).toBeUndefined();
  });
});
