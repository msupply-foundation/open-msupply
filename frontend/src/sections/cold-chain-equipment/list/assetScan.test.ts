import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphqlResult } from '@/api/graphql';
import { readText } from '@/domain/barcode';

// Scanning an asset (spec/cold-chain-equipment › rules § scanning an asset;
// contract § Scanning an asset) over a stubbed transport.

type Call = { operation: string; variables: unknown };
const calls: Call[] = [];
let answers: Record<string, GraphqlResult<unknown>> = {};

vi.mock('@/api/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/graphql')>();
  return {
    ...actual,
    graphqlFetch: (
      document: { query: string },
      variables: unknown,
      options?: { mapSuccessToError?: (data: unknown) => string | undefined }
    ) => {
      const operation =
        /(query|mutation)\s+(\w+)/.exec(document.query)?.[2] ?? 'anonymous';
      calls.push({ operation, variables });
      const answer = answers[operation];
      if (!answer) throw new Error(`no stubbed answer for ${operation}`);
      if (
        answer.kind === 'success' &&
        options?.mapSuccessToError?.(answer.data) !== undefined
      )
        return Promise.resolve({ kind: 'unexpectedError' });
      return Promise.resolve(answer);
    },
  };
});

const { buildScannedInsertInput, resolveAssetScan } =
  await import('./assetScan');

const GS = '\u001d';
// A manufacturer's label: part number (241), serial (21), warranty (91).
const label = readText(`]d224112345${GS}21SN-9${GS}91240101-290101`);
const read = (text: string) => {
  const scan = readText(text);
  if (scan.kind === 'unreadable') throw new Error('unreadable');
  return scan;
};

const draft = {
  __typename: 'AssetNode' as const,
  id: '',
  assetNumber: '12345:SN-9',
  serialNumber: 'SN-9',
  catalogueItemId: 'cat-1',
  warrantyStart: '2024-01-01',
  warrantyEnd: '2029-01-01',
  installationDate: '2026-09-23',
  lockedFields: {
    serialNumber: true,
    catalogueItemId: true,
    warrantyStart: true,
    warrantyEnd: true,
  },
};

const gs1Answer = (response: unknown): GraphqlResult<unknown> => ({
  kind: 'success',
  data: { assetFromGs1Data: response },
});

beforeEach(() => {
  calls.length = 0;
  answers = {};
});

describe('an asset’s own label — the app’s printed id', () => {
  it('opens the asset it names', async () => {
    answers.assetById = {
      kind: 'success',
      data: {
        assets: {
          __typename: 'AssetConnector',
          totalCount: 1,
          nodes: [{ id: 'a1' }],
        },
      },
    };
    expect(await resolveAssetScan('s1', read('a1'))).toEqual({
      kind: 'open',
      assetId: 'a1',
    });
    expect(calls[0]?.variables).toEqual({ storeId: 's1', assetId: 'a1' });
  });

  it('reports an id nothing matches', async () => {
    answers.assetById = {
      kind: 'success',
      data: {
        assets: { __typename: 'AssetConnector', totalCount: 0, nodes: [] },
      },
    };
    expect(await resolveAssetScan('s1', read('nope'))).toEqual({
      kind: 'not-found',
      content: 'nope',
    });
  });

  it('sends nothing for an empty scan', async () => {
    expect(await resolveAssetScan('s1', read(''))).toMatchObject({
      kind: 'not-found',
    });
    expect(calls).toEqual([]);
  });
});

describe('a manufacturer’s GS1 label', () => {
  it('sends every element to the resolver as read', async () => {
    answers.assetFromGs1Data = gs1Answer({ ...draft, id: 'a2' });
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    await resolveAssetScan('s1', label);
    expect(calls[0]?.variables).toEqual({
      storeId: 's1',
      gs1: [
        { ai: '241', data: '12345' },
        { ai: '21', data: 'SN-9' },
        { ai: '91', data: '240101-290101' },
      ],
    });
  });

  it('opens a matching asset', async () => {
    answers.assetFromGs1Data = gs1Answer({ ...draft, id: 'a2' });
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    expect(await resolveAssetScan('s1', label)).toEqual({
      kind: 'open',
      assetId: 'a2',
    });
  });

  it('offers an unmatched label as a draft', async () => {
    answers.assetFromGs1Data = gs1Answer(draft);
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    expect(await resolveAssetScan('s1', label)).toEqual({
      kind: 'draft',
      draft,
    });
  });

  it('reports a draft the catalogue cannot classify as not found', async () => {
    answers.assetFromGs1Data = gs1Answer({ ...draft, catalogueItemId: null });
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    expect(await resolveAssetScan('s1', label)).toMatchObject({
      kind: 'not-found',
    });
  });

  it('takes a label with no serial or part number as not found, not a failure', async () => {
    answers.assetFromGs1Data = {
      kind: 'graphqlError',
      message: 'Internal error',
      errors: [{ message: 'Internal error' }],
    };
    const box = read(`]d20105012345678900${GS}10AB12`);
    expect(await resolveAssetScan('s1', box)).toMatchObject({
      kind: 'not-found',
    });
  });

  it('takes the RecordNotFound branch as not found', async () => {
    answers.assetFromGs1Data = gs1Answer({
      __typename: 'ScannedDataParseError',
      error: { __typename: 'RecordNotFound', description: 'not found' },
    });
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    expect(await resolveAssetScan('s1', label)).toMatchObject({
      kind: 'not-found',
    });
  });

  it('treats any other union error as a failure', async () => {
    answers.assetFromGs1Data = gs1Answer({
      __typename: 'ScannedDataParseError',
      error: { __typename: 'DatabaseError', description: 'db' },
    });
    if (label.kind !== 'gs1') throw new Error('expected a GS1 read');
    expect(await resolveAssetScan('s1', label)).toEqual({ kind: 'failed' });
  });
});

describe('buildScannedInsertInput', () => {
  it('sends what the label supplied, with its locks', () => {
    expect(buildScannedInsertInput(draft, 'new-id')).toEqual({
      id: 'new-id',
      classId: expect.any(String),
      assetNumber: '12345:SN-9',
      serialNumber: 'SN-9',
      catalogueItemId: 'cat-1',
      warrantyStart: '2024-01-01',
      warrantyEnd: '2029-01-01',
      installationDate: '2026-09-23',
      lockedFieldsJson:
        '{"serialNumber":true,"catalogueItemId":true,"warrantyStart":true,"warrantyEnd":true}',
    });
  });
});
