import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import {
  BASE_YEAR,
  GENERAL_ROW_ID,
  ZERO_RATES,
  type SaveInputs,
} from './draft';

// The reads and the save, exercised over a stubbed transport so each wire
// outcome the spec names — the absent-rates miss, a rejected row alongside
// accepted ones, the server's own no-permission refusal, the off-central
// refusal — drives the screen's behaviour. The same legs were driven against
// a running central server; see BUILD_REPORT.md § C2.
//
// Behaviour anchors: spec/demographics/cases/OMS-REG-MNG-03 (behaviour ids,
// cited as `.n`; the former AC-* ids map to them in acceptance.md).

type Call = {
  operation: string;
  query: string;
  variables: unknown;
  options: unknown;
};
const calls: Call[] = [];
// Answers by operation name; a function gets the variables.
let answers: Record<
  string,
  GraphqlResult<unknown> | ((variables: unknown) => GraphqlResult<unknown>)
> = {};
const denied = vi.fn<(permissions: string[]) => void>();

const operationName = (query: string) =>
  /(query|mutation)\s+(\w+)/.exec(query)?.[2] ?? 'anonymous';

vi.mock('@/api/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/graphql')>();
  return {
    ...actual,
    reportPermissionDenied: (permissions: string[]) => denied(permissions),
    graphqlFetch: (
      document: { query: string },
      variables: unknown,
      options: unknown
    ) => {
      const operation = operationName(document.query);
      calls.push({ operation, query: document.query, variables, options });
      const answer = answers[operation];
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      return Promise.resolve(
        typeof answer === 'function' ? answer(variables) : answer
      );
    },
  };
});

const { loadDemographics, saveDemographics } =
  await import('./demographicsApi');

const generalNode = {
  id: GENERAL_ROW_ID,
  name: 'General Population',
  baseYear: BASE_YEAR,
  basePopulation: 1000,
  populationPercentage: 100,
  year1Projection: 0,
  year2Projection: 0,
  year3Projection: 0,
  year4Projection: 0,
  year5Projection: 0,
};

const indicatorsAnswer = (nodes: unknown[]): GraphqlResult<unknown> => ({
  kind: 'success',
  data: {
    demographicIndicators: {
      __typename: 'DemographicIndicatorConnector',
      totalCount: nodes.length,
      nodes,
    },
  },
});

const projectionNode = {
  __typename: 'DemographicProjectionNode',
  id: 'proj-2024',
  baseYear: BASE_YEAR,
  year1: 1,
  year2: 2,
  year3: 3,
  year4: 4,
  year5: 5,
};

const notFound: GraphqlResult<unknown> = {
  kind: 'success',
  data: {
    demographicProjectionByBaseYear: {
      __typename: 'NodeError',
      error: { __typename: 'RecordNotFound', description: 'Record not found' },
    },
  },
};

const node = (id: string): GraphqlResult<unknown> => ({
  kind: 'success',
  data: {
    centralServer: {
      demographic: { [id]: { __typename: 'DemographicIndicatorNode', id } },
    },
  },
});

// The UNTYPED refusal every mutation answers with (contract § rejections):
// a top-level "Bad user input" carrying the variant in extensions.details,
// with the whole centralServer selection null.
const badInput = (details: string): GraphqlResult<unknown> => ({
  kind: 'graphqlError',
  message: `Bad user input: ${details}`,
  errors: [
    {
      message: 'Bad user input',
      path: ['centralServer', 'demographic', 'insertDemographicIndicator'],
      extensions: { details },
    },
  ],
});

const forbidden: GraphqlResult<unknown> = {
  kind: 'graphqlError',
  message: 'Forbidden',
  errors: [
    {
      message: 'Forbidden',
      extensions: {
        details:
          'Missing permission: EditCentralData, Required permissions: HasPermission(EditCentralData), Store: None',
      },
    },
  ],
};

const notCentral: GraphqlResult<unknown> = {
  kind: 'graphqlError',
  message: 'Internal error: Not a central server',
  errors: [
    {
      message: 'Internal error',
      path: ['centralServer'],
      extensions: { details: 'Not a central server' },
    },
  ],
};

const inputs = (): SaveInputs => ({
  updates: [
    {
      id: GENERAL_ROW_ID,
      name: 'General population',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 100,
      year1Projection: 1000,
      year2Projection: 1000,
      year3Projection: 1000,
      year4Projection: 1000,
      year5Projection: 1000,
    },
    {
      id: 'a',
      name: 'Adults',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 60,
      year1Projection: 600,
      year2Projection: 600,
      year3Projection: 600,
      year4Projection: 600,
      year5Projection: 600,
    },
  ],
  inserts: [
    {
      id: 'new-1',
      name: 'Children',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 30,
      year1Projection: 300,
      year2Projection: 300,
      year3Projection: 300,
      year4Projection: 300,
      year5Projection: 300,
    },
    {
      id: 'new-2',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 0,
      year1Projection: 0,
      year2Projection: 0,
      year3Projection: 0,
      year4Projection: 0,
      year5Projection: 0,
    },
  ],
  projection: {
    kind: 'update',
    input: { id: 'proj-2024', baseYear: BASE_YEAR, ...ZERO_RATES },
  },
});

const sent = (operation: string) =>
  calls.filter(call => call.operation === operation);

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));

beforeEach(() => {
  calls.length = 0;
  answers = {};
  denied.mockClear();
});

describe('loading the grid (contract § the grid, § growth rates)', () => {
  it('OMS-REG-MNG-03.2 — answers the indicators, whole, and the base year’s stored rates', async () => {
    answers = {
      demographicIndicators: indicatorsAnswer([generalNode]),
      demographicProjectionByBaseYear: {
        kind: 'success',
        data: { demographicProjectionByBaseYear: projectionNode },
      },
    };
    const loaded = await loadDemographics('store-1');
    expect(loaded).toEqual({
      indicators: [generalNode],
      projection: projectionNode,
    });
    // One generous page (OMS-REG-MNG-03.1: the reference client's first: 20
    // is the capture, not the rule), with the name sort sent EXPLICITLY —
    // without it the server orders by raw name and upper-case names come
    // first (OMS-REG-MNG-03.16; contract wire trap).
    const read = sent('demographicIndicators')[0];
    expect(read?.variables).toEqual({ storeId: 'store-1' });
    expect(read?.query).toMatch(/first: 1000/);
    expect(read?.query).toMatch(/sort: \[\{key: name, desc: false\}\]/);
    expect(sent('demographicProjectionByBaseYear')[0]?.variables).toEqual({
      baseYear: BASE_YEAR,
    });
  });

  it('OMS-REG-MNG-03.19 — reads the typed RecordNotFound miss as "no record yet", not as a failure', async () => {
    answers = {
      demographicIndicators: indicatorsAnswer([generalNode]),
      demographicProjectionByBaseYear: notFound,
    };
    const loaded = await loadDemographics('store-1');
    expect(loaded?.projection).toBeUndefined();
    // …while any OTHER NodeError member is promoted to the global modal.
    const options = sent('demographicProjectionByBaseYear')[0]?.options as {
      mapSuccessToError: (data: unknown) => string | undefined;
    };
    expect(
      options.mapSuccessToError(
        notFound.kind === 'success' ? notFound.data : {}
      )
    ).toBeUndefined();
    expect(
      options.mapSuccessToError({
        demographicProjectionByBaseYear: {
          __typename: 'NodeError',
          error: { __typename: 'DatabaseError', description: 'db down' },
        },
      })
    ).toBe('db down');
  });

  it('a failed read leaves nothing to edit', async () => {
    answers = {
      demographicIndicators: { kind: 'unexpectedError' },
      demographicProjectionByBaseYear: notFound,
    };
    expect(await loadDemographics('store-1')).toBeUndefined();
  });
});

describe('saving the draft (rules § saving the draft)', () => {
  it('OMS-REG-MNG-03.40 — writes every row, then the rates once every row was accepted', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      insertDemographicIndicator: node('insertDemographicIndicator'),
      updateDemographicProjection: node('updateDemographicProjection'),
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toEqual({ kind: 'saved' });
    expect(sent('updateDemographicIndicator').map(c => c.variables)).toEqual(
      inputs().updates.map(input => ({ input }))
    );
    expect(sent('insertDemographicIndicator').map(c => c.variables)).toEqual(
      inputs().inserts.map(input => ({ input }))
    );
    // The rates go last: after the fourth row, never before.
    expect(calls.map(c => c.operation).at(-1)).toBe(
      'updateDemographicProjection'
    );
    expect(sent('updateDemographicProjection')[0]?.variables).toEqual({
      input: inputs().projection.input,
    });
    // Every write reads its own GraphQL errors — the rejections are untyped.
    expect(
      calls.every(
        c =>
          (c.options as { returnGraphqlErrors?: boolean }).returnGraphqlErrors
      )
    ).toBe(true);
  });

  it('OMS-REG-MNG-03.36 — creates the growth-rate record when none is stored', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      insertDemographicIndicator: node('insertDemographicIndicator'),
      insertDemographicProjection: node('insertDemographicProjection'),
    };
    const outcome = await saveDemographics({
      ...inputs(),
      projection: {
        kind: 'insert',
        input: { id: 'fresh', baseYear: BASE_YEAR, ...ZERO_RATES },
      },
    });
    expect(outcome).toEqual({ kind: 'saved' });
    expect(sent('insertDemographicProjection')[0]?.variables).toEqual({
      input: { id: 'fresh', baseYear: BASE_YEAR, ...ZERO_RATES },
    });
    expect(sent('updateDemographicProjection')).toHaveLength(0);
  });

  it('OMS-REG-MNG-03.41 / OMS-REG-MNG-03.26 — a rejected row does not undo the others, and the rates are not written', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      // The blank-named new row is refused; the named one is accepted.
      insertDemographicIndicator: variables =>
        (variables as { input: { name?: string } }).input.name === undefined
          ? badInput('DemographicIndicatorHasNoName')
          : node('insertDemographicIndicator'),
      updateDemographicProjection: node('updateDemographicProjection'),
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toEqual({
      kind: 'rejected',
      rejection: {
        message: 'Demographic indicator has no name',
        detail: 'DemographicIndicatorHasNoName',
      },
      acceptedNewIds: ['new-1'],
    });
    // Every row was still sent — the rows are independent — but the rates
    // were not.
    expect(sent('updateDemographicIndicator')).toHaveLength(2);
    expect(sent('insertDemographicIndicator')).toHaveLength(2);
    expect(sent('updateDemographicProjection')).toHaveLength(0);
  });

  it('OMS-REG-MNG-03.27 — names the duplicate-name rejection in the screen’s words', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      insertDemographicIndicator: badInput(
        'DemographicIndicatorAlreadyExistsForThisYear'
      ),
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toMatchObject({
      kind: 'rejected',
      rejection: {
        message: 'Demographic indicator already exists for this year',
      },
    });
  });

  it('OMS-REG-MNG-03.37 — a rates rejection is reported the same way, after the rows landed', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      insertDemographicIndicator: node('insertDemographicIndicator'),
      updateDemographicProjection: badInput(
        'DemographicProjectionBaseYearAlreadyExists'
      ),
    };
    const outcome = await saveDemographics(inputs());
    // No catalog entry: the variant name in words is the fallback.
    expect(outcome).toMatchObject({
      kind: 'rejected',
      rejection: {
        message: 'Demographic Projection Base Year Already Exists',
        detail: 'DemographicProjectionBaseYearAlreadyExists',
      },
      acceptedNewIds: ['new-1', 'new-2'],
    });
  });

  it('OMS-REG-MNG-03.12 — the off-central refusal reaches the notice as the server’s own text', async () => {
    answers = {
      updateDemographicIndicator: notCentral,
      insertDemographicIndicator: notCentral,
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toMatchObject({
      kind: 'rejected',
      rejection: { message: 'Not a central server' },
      acceptedNewIds: [],
    });
    expect(sent('updateDemographicProjection')).toHaveLength(0);
  });

  it('OMS-REG-MNG-03.15 — the server’s own no-permission refusal raises the permission-denied modal, not the notice', async () => {
    answers = {
      updateDemographicIndicator: forbidden,
      insertDemographicIndicator: forbidden,
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toEqual({ kind: 'failed', acceptedNewIds: [] });
    expect(denied).toHaveBeenCalledWith(['EditCentralData']);
    expect(sent('updateDemographicProjection')).toHaveLength(0);
  });

  it('a transport failure is already reported globally — nothing more to show', async () => {
    answers = {
      updateDemographicIndicator: node('updateDemographicIndicator'),
      insertDemographicIndicator: { kind: 'unexpectedError' },
    };
    const outcome = await saveDemographics(inputs());
    expect(outcome).toEqual({ kind: 'failed', acceptedNewIds: [] });
    expect(denied).not.toHaveBeenCalled();
  });
});
