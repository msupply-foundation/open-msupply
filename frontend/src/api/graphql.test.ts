import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearForbiddenError,
  clearUnexpectedError,
  forbiddenError,
  graphqlFetch,
  unexpectedError,
  type GraphqlResult,
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
    .mockResolvedValue({ ok, status, text: async () => JSON.stringify(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearUnexpectedError();
  clearUnauthenticated();
  clearForbiddenError();
});

// The real shape of a permission-denied error from the server (verified live):
// message "Forbidden", the required permissions inside extensions.details.
const forbiddenBody = (details: string) => ({
  data: null,
  errors: [{ message: 'Forbidden', extensions: { details } }],
});

describe('graphqlFetch', () => {
  it('posts the document and returns a success result', async () => {
    const fetchMock = mockFetch({ data: { thing: { id: '1' } } });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'success', data: { thing: { id: '1' } } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/graphql?opName=thing');
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
    expect(unexpectedError()).toMatchObject({
      condition: 'unknown',
      cause: 'Something failed, Also this',
    });
  });

  it('surfaces extensions.details in the description when it adds detail', async () => {
    mockFetch({
      data: null,
      errors: [
        {
          message: 'Bad user input',
          extensions: { details: 'DatabaseError("connection reset")' },
        },
        // details equal to the message add nothing → not repeated.
        { message: 'Plain', extensions: { details: 'Plain' } },
        // non-string / empty details are ignored → bare message.
        { message: 'NoDetail', extensions: { code: 500 } },
      ],
    });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'unexpectedError' });
    expect(unexpectedError()?.cause).toBe(
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
    expect(unexpectedError()).toMatchObject({
      condition: 'server',
      cause: 'HTTP 500',
    });
  });

  it('classifies HTTP 408 as the timed-out condition', async () => {
    mockFetch({}, false, 408);
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toMatchObject({
      condition: 'timeout',
      cause: 'HTTP 408',
    });
  });

  it('classifies other non-OK statuses as the unmapped fallback', async () => {
    mockFetch({}, false, 418);
    await graphqlFetch(document, {});
    expect(unexpectedError()).toMatchObject({
      condition: 'unknown',
      cause: 'HTTP 418',
    });
  });

  // Spec (startup › contract § unexpected API errors): the support block names
  // the failed operation, carries a quotable timestamp-based reference, and a
  // mutation failure is flagged as interrupting an edit.
  it('names the request, mints a quotable reference, and flags a mutation as an edit', async () => {
    mockFetch({}, false, 500);
    await graphqlFetch(document, {});
    expect(unexpectedError()).toMatchObject({
      request: 'query thing',
      duringEdit: false,
    });
    expect(unexpectedError()?.reference).toMatch(
      /^[0-9a-f]{4}-\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/
    );

    const mutationDocument: TypedDocument<Result, Record<string, never>> = {
      query: 'mutation saveThing { thing { id } }',
    };
    mockFetch({}, false, 500);
    await graphqlFetch(mutationDocument, {});
    expect(unexpectedError()).toMatchObject({
      request: 'mutation saveThing',
      duringEdit: true,
    });
  });

  it('returns unexpectedError when fetch rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network down'))
    );
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toMatchObject({
      condition: 'unreachable',
      cause: 'Network down',
    });
  });

  it('returns unexpectedError when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      })
    );
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toMatchObject({
      condition: 'unknown',
      cause: 'Unexpected token < in JSON',
    });
  });

  it('returns unexpectedError when the body has neither data nor errors', async () => {
    mockFetch({});
    expect(await graphqlFetch(document, {})).toEqual({
      kind: 'unexpectedError',
    });
    expect(unexpectedError()).toMatchObject({
      condition: 'unknown',
      cause: 'Response contained neither data nor errors',
    });
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
    expect(unexpectedError()).toMatchObject({
      condition: 'unknown',
      cause: 'Record does not exist',
    });
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

  it('returns forbidden with the parsed permission names, not unexpectedError', async () => {
    mockFetch(
      forbiddenBody(
        'Missing access to store: X, Required permissions: And([HasStoreAccess, HasPermission(StocktakeMutate)]), Store: Some("X")'
      )
    );
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'forbidden' });
    // Only the HasPermission(...) name — HasStoreAccess is dropped.
    expect(forbiddenError()).toEqual(['StocktakeMutate']);
    expect(unexpectedError()).toBeUndefined();
  });

  it('sets an empty permission list when Forbidden carries no parseable detail', async () => {
    mockFetch({ data: null, errors: [{ message: 'Forbidden' }] });
    const result = await graphqlFetch(document, {});
    expect(result).toEqual({ kind: 'forbidden' });
    expect(forbiddenError()).toEqual([]);
  });

  it('hands Forbidden to the caller as a graphqlError when opted in, no global signal', async () => {
    mockFetch(
      forbiddenBody('Required permissions: HasPermission(StocktakeMutate)')
    );
    const result = await graphqlFetch(
      document,
      {},
      { returnGraphqlErrors: true }
    );
    expect(result.kind).toBe('graphqlError');
    expect(forbiddenError()).toBeUndefined();
  });

  it('does not trip the forbidden modal for a background call', async () => {
    mockFetch(
      forbiddenBody('Required permissions: HasPermission(StocktakeQuery)')
    );
    const result = await graphqlFetch(document, {}, { background: true });
    expect(result).toEqual({ kind: 'forbidden' });
    expect(forbiddenError()).toBeUndefined();
  });
});

/*
 * Structural sharing (kdd/state-management decision 5): a query whose response
 * body is byte-identical to its previous response returns the SAME parsed
 * object, so state published straight off the response compares
 * reference-equal at its signal and an unchanged background refresh notifies
 * nobody. Distinct documents per test — the share cache is module state.
 */
describe('graphqlFetch structural sharing', () => {
  const successData = <T>(result: GraphqlResult<T>): T => {
    if (result.kind !== 'success') throw new Error(`got ${result.kind}`);
    return result.data;
  };

  it('returns the same parsed object for a byte-identical query response', async () => {
    const doc: TypedDocument<Result, Record<string, never>> = {
      query: 'query shareIdentical { thing { id } }',
    };
    mockFetch({ data: { thing: { id: '1' } } });
    const first = successData(await graphqlFetch(doc, {}));
    const second = successData(await graphqlFetch(doc, {}));
    expect(second).toBe(first);
  });

  it('parses fresh when the response changes, then shares the new response', async () => {
    const doc: TypedDocument<Result, Record<string, never>> = {
      query: 'query shareChanges { thing { id } }',
    };
    const fetchMock = vi.fn();
    for (const id of ['1', '2', '2']) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { thing: { id } } }),
      });
    }
    vi.stubGlobal('fetch', fetchMock);
    const first = successData(await graphqlFetch(doc, {}));
    const second = successData(await graphqlFetch(doc, {}));
    expect(second).not.toBe(first);
    expect(second.thing.id).toBe('2');
    const third = successData(await graphqlFetch(doc, {}));
    expect(third).toBe(second);
  });

  it('does not share across different variables for the same operation', async () => {
    const doc: TypedDocument<Result, { n: number }> = {
      query: 'query shareVars($n: Int!) { thing(n: $n) { id } }',
    };
    mockFetch({ data: { thing: { id: '1' } } });
    const first = successData(await graphqlFetch(doc, { n: 1 }));
    const second = successData(await graphqlFetch(doc, { n: 2 }));
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it('never shares mutation responses', async () => {
    const doc: TypedDocument<Result, Record<string, never>> = {
      query: 'mutation shareMutation { thing { id } }',
    };
    mockFetch({ data: { thing: { id: '1' } } });
    const first = successData(await graphqlFetch(doc, {}));
    const second = successData(await graphqlFetch(doc, {}));
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });

  it('re-applies the success mapper on a shared response', async () => {
    const doc: TypedDocument<Result, Record<string, never>> = {
      query: 'query shareMapped { thing { id } }',
    };
    mockFetch({ data: { thing: { id: 'bad' } } });
    const mapper = (data: Result) =>
      data.thing.id === 'bad' ? 'Record does not exist' : undefined;
    successData(await graphqlFetch(doc, {}));
    const mapped = await graphqlFetch(doc, {}, { mapSuccessToError: mapper });
    expect(mapped).toEqual({ kind: 'unexpectedError' });
  });
});
