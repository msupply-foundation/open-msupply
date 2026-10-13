/*
 * The line editor's draft-method flow (spec/internal-orders rules › choosing a
 * method; OMS-REG-REPL-17.6, .21–.23): a method picked in the editor is a
 * draft edit — previewed by the server, never saved by the preview — and the
 * save sends whichever method the draft holds. The server's arithmetic is its
 * own (the e2e suites cover it); these pin what the client asks for and what it
 * does with the answer.
 */
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { graphqlFetch } from '@/api/graphql';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import type { InternalOrderLineFragment } from '../internalOrderDetail.generated';
import {
  AddInternalOrderLine,
  InternalOrderItemStats,
  InternalOrderLineForecastPreview,
  UpdateInternalOrderLine,
} from './internalOrderLineEdit.generated';
import {
  buildAddPreview,
  editorLineFromLine,
  previewActivity,
  previewForecastMethod,
  saveExistingLine,
  saveNewLine,
  type EditorLine,
} from './internalOrderLineEdit';

vi.mock('@/api/graphql', () => ({
  graphqlFetch: vi.fn(),
  msSinceLastGqlCall: vi.fn(() => 0),
  isForbidden: vi.fn(() => false),
  missingPermissions: vi.fn(() => []),
  reportPermissionDenied: vi.fn(),
}));
const fetchMock = vi.mocked(graphqlFetch);

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));
beforeEach(() => fetchMock.mockReset());

// A stored AMC line: 60 in stock, 30 a month.
const storedLine = (): InternalOrderLineFragment => ({
  id: 'line-1',
  itemId: 'item-1',
  itemName: 'Measles vaccine',
  comment: null,
  campaign: null,
  item: {
    code: 'MEA',
    unitName: 'vial',
    defaultPackSize: 1,
    doses: 10,
    isVaccine: true,
  },
  requestedQuantity: 40,
  suggestedQuantity: 30,
  approvedQuantity: 0,
  approvalComment: null,
  availableStockOnHand: 60,
  averageMonthlyConsumption: 30,
  initialStockOnHandUnits: 0,
  incomingUnits: 0,
  outgoingUnits: 0,
  lossInUnits: 0,
  additionInUnits: 0,
  expiringUnits: 0,
  daysOutOfStock: 0,
  pricePerUnit: null,
  forecastMethod: 'AMC',
  forecastMonthlyConsumption: 30,
  targetStock: 90,
  forecastBreakdown: {
    __typename: 'AmcForecastNode',
    averageMonthlyConsumption: 30,
  },
  forecastMethodOptions: [
    { method: 'AMC', isAvailable: true, unavailableReason: null },
    { method: 'POPULATION', isAvailable: true, unavailableReason: null },
    {
      method: 'ANCILLARY_RATIO',
      isAvailable: false,
      unavailableReason: 'NO_PRINCIPAL_ON_ORDER',
    },
  ],
  optionId: null,
  reason: null,
  ancillaryParents: [],
});

// The server's preview of the line under Population: 120 a month.
const populationPreview = {
  __typename: 'RequisitionLineForecastPreviewNode' as const,
  suggestedQuantity: 300,
  averageMonthlyConsumption: 30,
  availableStockOnHand: 60,
  forecastMethod: 'POPULATION' as const,
  forecastMonthlyConsumption: 120,
  targetStock: 360,
  forecastBreakdown: {
    __typename: 'PopulationForecastNode' as const,
    populationServed: 1000,
    courses: [],
  },
  forecastMethodOptions: storedLine().forecastMethodOptions,
};

// Minimal wire payloads; the cast is the test's trusted seam (the real shapes
// are codegen-validated end to end).
const success = (data: unknown) => ({ kind: 'success', data }) as never;
const previewResponse = (node: unknown) =>
  success({ requisitionLineForecastPreview: node });

const draft = { requestedQuantity: 40, comment: 'note', campaignId: null };

describe('OMS-REG-REPL-17.6 — a draft method change previews the line under it', () => {
  it('asks for the line under the picked method and saves nothing', async () => {
    fetchMock.mockResolvedValue(previewResponse(populationPreview));
    await previewForecastMethod(
      'store-a',
      'req-1',
      editorLineFromLine(storedLine()),
      'POPULATION'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(InternalOrderLineForecastPreview);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      storeId: 'store-a',
      input: {
        requisitionId: 'req-1',
        itemId: 'item-1',
        forecastMethod: 'POPULATION',
        // The draft's Activity travels with every preview, so a method change
        // never re-scopes the stock back to the STORED activity (issue 595)
        campaignId: { value: null },
      },
    });
  });

  it('recomputes the forecast and suggestion, keeping the draft and the line`s own method', async () => {
    fetchMock.mockResolvedValue(previewResponse(populationPreview));
    const line = {
      ...editorLineFromLine(storedLine()),
      requestedQuantity: 55,
      comment: 'typed',
    };
    const result = await previewForecastMethod(
      'store-a',
      'req-1',
      line,
      'POPULATION'
    );
    expect(result.kind).toBe('previewed');
    const previewed = (result as { line: EditorLine }).line;
    expect(previewed.forecast.forecastMethod).toBe('POPULATION');
    expect(previewed.monthlyDemand).toBe(120);
    expect(previewed.suggestedQuantity).toBe(300);
    expect(previewed.monthsOfStock).toBe(0.5);
    // The draft's own fields are the caller's, untouched.
    expect(previewed.requestedQuantity).toBe(55);
    expect(previewed.comment).toBe('typed');
    // The stored method stands until Save (OMS-REG-REPL-17.22).
    expect(previewed.ownForecastMethod).toBe('AMC');
    expect(previewed.isNew).toBe(false);
  });

  it('surfaces an unavailable method as its reason', async () => {
    fetchMock.mockResolvedValue(
      previewResponse({
        __typename: 'RequisitionLineForecastPreviewError',
        error: {
          __typename: 'ForecastMethodNotAvailable',
          description: 'not available',
          unavailableReason: 'NO_PRINCIPAL_ON_ORDER',
        },
      })
    );
    const result = await previewForecastMethod(
      'store-a',
      'req-1',
      editorLineFromLine(storedLine()),
      'ANCILLARY_RATIO'
    );
    expect(result).toEqual({
      kind: 'error',
      message: commonEn['messages.forecast-method-unavailable-no-principal'],
    });
  });

  it('reports a failed read as failed', async () => {
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    const result = await previewForecastMethod(
      'store-a',
      'req-1',
      editorLineFromLine(storedLine()),
      'POPULATION'
    );
    expect(result).toEqual({ kind: 'failed' });
  });
});

describe('a draft Activity change previews the line held for it (issue 595)', () => {
  // The same preview the server answers a method change with, but scoped: only
  // the campaign's stock counts, so the suggestion rises to cover the shortfall.
  const campaignPreview = {
    ...populationPreview,
    forecastMethod: 'AMC' as const,
    forecastMonthlyConsumption: 30,
    availableStockOnHand: 7,
    suggestedQuantity: 83,
    forecastBreakdown: {
      __typename: 'AmcForecastNode' as const,
      averageMonthlyConsumption: 30,
    },
  };
  const measles = { id: 'camp-1', name: 'Measles 2026' };

  it('asks for the line held for the chosen activity, under the draft`s own method', async () => {
    fetchMock.mockResolvedValue(previewResponse(campaignPreview));
    await previewActivity(
      'store-a',
      'req-1',
      editorLineFromLine(storedLine()),
      measles
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      storeId: 'store-a',
      input: {
        requisitionId: 'req-1',
        itemId: 'item-1',
        // The draft's method, not null: picking an activity must not revert a
        // method the user has already changed
        forecastMethod: 'AMC',
        campaignId: { value: 'camp-1' },
      },
    });
  });

  it('narrows the shown stock and suggestion, and carries the chosen activity', async () => {
    fetchMock.mockResolvedValue(previewResponse(campaignPreview));
    const line = {
      ...editorLineFromLine(storedLine()),
      requestedQuantity: 55,
      comment: 'typed',
    };
    const result = await previewActivity('store-a', 'req-1', line, measles);
    expect(result.kind).toBe('previewed');
    const previewed = (result as { line: EditorLine }).line;
    // The whole-store 60 narrows to the campaign's 7, and the suggestion
    // follows it up — the under-ordering issue 595 is about
    expect(previewed.availableStockOnHand).toBe(7);
    expect(previewed.suggestedQuantity).toBe(83);
    expect(previewed.campaign).toEqual(measles);
    // The draft's own fields are the caller's, untouched
    expect(previewed.requestedQuantity).toBe(55);
    expect(previewed.comment).toBe('typed');
  });

  it('clears back to the whole store', async () => {
    fetchMock.mockResolvedValue(previewResponse(populationPreview));
    const result = await previewActivity(
      'store-a',
      'req-1',
      { ...editorLineFromLine(storedLine()), campaign: measles },
      null
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      input: { campaignId: { value: null } },
    });
    expect((result as { line: EditorLine }).line.campaign).toBe(null);
  });

  it('reports a failed read as failed', async () => {
    fetchMock.mockResolvedValue({ kind: 'error' } as never);
    expect(
      await previewActivity(
        'store-a',
        'req-1',
        editorLineFromLine(storedLine()),
        measles
      )
    ).toEqual({ kind: 'failed' });
  });
});

describe('OMS-REG-REPL-17.21 — a new item`s draft is the line its insert would create', () => {
  const itemStats = success({
    items: {
      __typename: 'ItemConnector',
      nodes: [
        {
          id: 'item-1',
          code: 'MEA',
          name: 'Measles vaccine',
          unitName: 'vial',
          defaultPackSize: 1,
          doses: 10,
          isVaccine: true,
        },
      ],
    },
  });

  it('previews the default method (null) and takes it as the line`s own', async () => {
    fetchMock.mockImplementation(async document =>
      document === InternalOrderItemStats
        ? itemStats
        : previewResponse(populationPreview)
    );
    const line = await buildAddPreview('store-a', 'req-1', 'item-1', 'new-id');
    const previewCall = fetchMock.mock.calls.find(
      ([document]) => document === InternalOrderLineForecastPreview
    );
    expect(previewCall?.[1]).toEqual({
      storeId: 'store-a',
      input: {
        requisitionId: 'req-1',
        itemId: 'item-1',
        forecastMethod: null,
        // A new line starts held for nothing in particular, as its insert would
        campaignId: { value: null },
      },
    });
    expect(line).toMatchObject({
      lineId: 'new-id',
      itemId: 'item-1',
      isNew: true,
      ownForecastMethod: 'POPULATION',
      monthlyDemand: 120,
      suggestedQuantity: 300,
      requestedQuantity: 0,
    });
    expect(line?.forecast.forecastMethod).toBe('POPULATION');
  });

  it('gives no draft when the preview fails', async () => {
    fetchMock.mockImplementation(async document =>
      document === InternalOrderItemStats
        ? itemStats
        : ({ kind: 'error' } as never)
    );
    expect(
      await buildAddPreview('store-a', 'req-1', 'item-1', 'new-id')
    ).toBeUndefined();
  });
});

describe('OMS-REG-REPL-17.22/.23 — the save sends the draft`s method', () => {
  it('a new line: inserts with the server default, then updates to the draft`s method', async () => {
    fetchMock.mockResolvedValue(
      success({
        batchRequestRequisition: {
          insertRequestRequisitionLines: [
            { id: 'new-id', response: { __typename: 'RequisitionLineNode' } },
          ],
          updateRequestRequisitionLines: [
            {
              id: 'new-id',
              response: { __typename: 'RequisitionLineNode', id: 'new-id' },
            },
          ],
        },
      })
    );
    // A draft whose preview moved the new item from Population to AMC.
    const line: EditorLine = {
      ...editorLineFromLine(storedLine()),
      lineId: 'new-id',
      isNew: true,
      ownForecastMethod: 'POPULATION',
    };
    expect(await saveNewLine('store-a', 'req-1', line, draft)).toEqual({
      kind: 'saved',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(AddInternalOrderLine);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      storeId: 'store-a',
      input: {
        // The insert carries no method — the server applies the default.
        insertRequestRequisitionLines: [
          { id: 'new-id', itemId: 'item-1', requisitionId: 'req-1' },
        ],
        updateRequestRequisitionLines: [
          {
            id: 'new-id',
            requestedQuantity: 40,
            comment: 'note',
            optionId: undefined,
            campaignId: { value: null },
            forecastMethod: 'AMC',
          },
        ],
      },
    });
  });

  it('an existing line: the update carries the previewed method', async () => {
    fetchMock.mockResolvedValue(
      success({
        updateRequestRequisitionLine: {
          __typename: 'RequisitionLineNode',
          id: 'line-1',
        },
      })
    );
    const line: EditorLine = {
      ...editorLineFromLine(storedLine()),
      forecast: populationPreview,
    };
    expect(await saveExistingLine('store-a', line, draft)).toEqual({
      kind: 'saved',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(UpdateInternalOrderLine);
    expect(fetchMock.mock.calls[0][1]).toEqual({
      storeId: 'store-a',
      input: {
        id: 'line-1',
        requestedQuantity: 40,
        comment: 'note',
        optionId: undefined,
        // Always sent, so a cleared Activity is a clear rather than a no-op.
        campaignId: { value: null },
        forecastMethod: 'POPULATION',
      },
    });
  });

  it('an unchanged line sends its stored method', async () => {
    fetchMock.mockResolvedValue(
      success({
        updateRequestRequisitionLine: {
          __typename: 'RequisitionLineNode',
          id: 'line-1',
        },
      })
    );
    await saveExistingLine('store-a', editorLineFromLine(storedLine()), draft);
    expect(
      (fetchMock.mock.calls[0][1] as { input: { forecastMethod: string } })
        .input.forecastMethod
    ).toBe('AMC');
  });

  it('a method gone unavailable by the save surfaces its reason', async () => {
    fetchMock.mockResolvedValue(
      success({
        updateRequestRequisitionLine: {
          __typename: 'UpdateRequestRequisitionLineError',
          error: {
            __typename: 'ForecastMethodNotAvailable',
            description: 'not available',
            unavailableReason: 'NO_VACCINE_COURSE',
          },
        },
      })
    );
    const line: EditorLine = {
      ...editorLineFromLine(storedLine()),
      forecast: populationPreview,
    };
    expect(await saveExistingLine('store-a', line, draft)).toEqual({
      kind: 'error',
      message:
        commonEn['messages.forecast-method-unavailable-no-vaccine-course'],
    });
  });
});
