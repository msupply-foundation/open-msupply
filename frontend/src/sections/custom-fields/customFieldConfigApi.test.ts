import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlResult } from '../../api/graphql';

// The two calls, exercised over a stubbed transport so each wire outcome the
// spec names (a scope's configuration, a failed read, the UNTYPED placement
// rejection, an empty update list) drives the screen's behaviour. The rejection
// and the transaction's all-or-nothing were additionally confirmed against a
// running central server — see BUILD_REPORT.md § C2.
//
// Behaviour anchors: spec/custom-fields/cases/OMS-REG-CF-02.

type Call = { query: string; variables: unknown; options: unknown };
const calls: Call[] = [];
let next: GraphqlResult<unknown>;

vi.mock('../../api/graphql', () => ({
  graphqlFetch: (
    document: { query: string },
    variables: unknown,
    options: unknown
  ) => {
    calls.push({ query: document.query, variables, options });
    return Promise.resolve(next);
  },
}));

const { readScopeConfig, saveScopePlacements } =
  await import('./customFieldConfigApi');
const { applyChoice } = await import('./placement');
import type { ConfigRow } from './placement';

const row = (id: string, displayMode: ConfigRow['displayMode']): ConfigRow => ({
  id,
  key: id,
  name: `Field ${id}`,
  valueType: 'TEXT',
  displayMode,
});

const connector = (nodes: ConfigRow[]) => ({
  __typename: 'CustomFieldConnector' as const,
  totalCount: nodes.length,
  nodes,
});

beforeEach(() => {
  calls.length = 0;
});

describe('reading one scope’s configuration (OMS-REG-CF-02.3, .16)', () => {
  it('lists what the scope returned, hidden fields included', async () => {
    const nodes = [row('a', 'VISIBLE'), row('b', 'HIDDEN')];
    next = {
      kind: 'success',
      data: {
        centralServer: {
          customField: { customFieldScopeConfig: connector(nodes) },
        },
      },
    };
    const read = await readScopeConfig('item');
    expect(read).toEqual({ kind: 'ok', scope: 'item', rows: nodes });
    expect(calls[0].variables).toEqual({ scope: 'item' });
  });

  it('reads an unknown scope as EMPTY, not as an error (.16)', async () => {
    // `scope` is a free-form String: an unknown, mis-cased or empty value
    // answers an empty connector with no error, so the screen shows its empty
    // state — the same surface a scope with no fields placed on it shows.
    next = {
      kind: 'success',
      data: {
        centralServer: {
          customField: { customFieldScopeConfig: connector([]) },
        },
      },
    };
    expect(await readScopeConfig('ITEM')).toEqual({
      kind: 'ok',
      scope: 'ITEM',
      rows: [],
    });
  });

  it('distinguishes a failed read from an empty scope', async () => {
    // Empty and failed say different things on screen (the empty state vs. the
    // shared data-error message), so a failure is never flattened to [].
    next = { kind: 'unexpectedError' };
    expect(await readScopeConfig('item')).toEqual({
      kind: 'error',
      scope: 'item',
    });
  });

  it('lets a permission or central-server refusal take the generic error path', async () => {
    // No returnGraphqlErrors on the read: a Forbidden routes to the
    // permission-denied modal and any other GraphQL error to the
    // unexpected-error modal (ui-surface S4).
    next = {
      kind: 'success',
      data: {
        centralServer: {
          customField: { customFieldScopeConfig: connector([]) },
        },
      },
    };
    await readScopeConfig('item');
    expect(calls[0].options).toBeUndefined();
  });
});

describe('saving one scope’s placements (OMS-REG-CF-02.6, .10, .11)', () => {
  const rows = [row('a', 'VISIBLE'), row('b', 'HIDDEN')];

  it('sends nothing when nothing is pending (.6)', async () => {
    expect(await saveScopePlacements('item', rows, {})).toEqual({
      kind: 'nothing-to-save',
    });
    expect(calls).toHaveLength(0);
  });

  it('sends one scope and only its changed placements (.10)', async () => {
    const pending = applyChoice({}, rows[0], 'HIDDEN');
    next = {
      kind: 'success',
      data: {
        centralServer: {
          customField: {
            updateScopes: connector([row('a', 'HIDDEN'), rows[1]]),
          },
        },
      },
    };
    const outcome = await saveScopePlacements('item', rows, pending);
    expect(calls[0].variables).toEqual({
      input: {
        scope: 'item',
        updates: [{ customFieldId: 'a', displayMode: 'HIDDEN' }],
      },
    });
    // The response carries the WHOLE scope's fresh configuration, so the rows
    // reseed from it with no re-read.
    expect(outcome).toEqual({
      kind: 'saved',
      rows: [row('a', 'HIDDEN'), rows[1]],
    });
  });

  it('reports the untyped rejection as a failure, keeping the batch unapplied (.11)', async () => {
    // The one real rejection has no typed union member: it arrives as a
    // top-level "Bad user input" carrying ScopeRowDoesNotExist("<id>") in
    // extensions.details, with the whole centralServer selection null. The
    // service's transaction means NONE of the batch was applied.
    const pending = applyChoice({}, rows[0], 'HIDDEN');
    next = {
      kind: 'graphqlError',
      message: 'Bad user input',
      errors: [
        {
          message: 'Bad user input',
          extensions: {
            details: 'ScopeRowDoesNotExist(\n    "no-such-field",\n)',
          },
        },
      ],
    };
    expect(await saveScopePlacements('item', rows, pending)).toEqual({
      kind: 'error',
    });
    // Read by the caller, not the global modal — so the pending changes survive
    // to be retried (D21).
    expect(calls[0].options).toEqual({ returnGraphqlErrors: true });
  });
});
