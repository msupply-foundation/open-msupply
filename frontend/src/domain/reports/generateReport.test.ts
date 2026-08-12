import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearUnexpectedError, unexpectedError } from '../../api/graphql';
import { generateReport } from './generateReport';
import { csvToExcel, mapPrintResponse } from '../reportFiles/csvToExcel';

// Generation faults belong to the control the user clicked, never the global
// unexpected-error modal (spec/reports S5 / AC-G6): its Reload re-runs the same
// failing generation and its Go to dashboard discards the user's place, while
// the screen behind it is perfectly healthy. Both wrappers therefore take the
// `returnGraphqlErrors` opt-in (kdd/state-management) and must come back with a
// describable `error`, with the global signal left clear.

const mockFetch = (body: unknown, ok = true, status = 200) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, status, json: async () => body })
  );
};

// The reported fault: the server drives headless Chrome to render a PDF, and a
// tablet's server has no Chrome executable (open-msupply#12289). It arrives as
// a plain GraphQL error — the typed union member is unreachable for it.
const chromeMissing = {
  data: null,
  errors: [
    {
      message: 'Internal error',
      extensions: {
        details: 'HTMLToPDFError("Could not auto detect a chrome executable")',
      },
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  clearUnexpectedError();
});

describe('generateReport', () => {
  it('returns an untyped generation fault as a describable error, no global modal', async () => {
    mockFetch(chromeMissing);
    const result = await generateReport({ reportId: 'r1', format: 'PDF' });
    expect(result).toEqual({
      kind: 'error',
      message:
        'Internal error: HTMLToPDFError("Could not auto detect a chrome executable")',
    });
    expect(unexpectedError()).toBeUndefined();
  });

  it('returns the file handle on success', async () => {
    mockFetch({
      data: {
        generateReport: { __typename: 'PrintReportNode', fileId: 'file-1' },
      },
    });
    const result = await generateReport({ reportId: 'r1', format: 'PDF' });
    expect(result).toEqual({ kind: 'fileId', fileId: 'file-1' });
  });
});

describe('csvToExcel', () => {
  it('claims its faults too — list exports report them at the export button', async () => {
    mockFetch(chromeMissing);
    const result = await csvToExcel({
      storeId: 's1',
      csvData: 'a,b',
      filename: 'f.xlsx',
      sheetName: 'S',
    });
    expect(result).toEqual({
      kind: 'error',
      message:
        'Internal error: HTMLToPDFError("Could not auto detect a chrome executable")',
    });
    expect(unexpectedError()).toBeUndefined();
  });
});

describe('mapPrintResponse', () => {
  it('carries the typed data-fetch failure’s raw query errors', () => {
    expect(
      mapPrintResponse({
        __typename: 'PrintReportError',
        error: {
          __typename: 'FailedToFetchReportData',
          description: 'Failed to fetch report data',
          errors: [{ message: 'no dataId' }],
        },
      })
    ).toEqual({ kind: 'dataError', errors: [{ message: 'no dataId' }] });
  });

  it('reports an unrecognised response rather than swallowing it', () => {
    expect(
      mapPrintResponse({
        __typename: 'Something else',
      } as unknown as Parameters<typeof mapPrintResponse>[0])
    ).toEqual({ kind: 'error', message: 'Unrecognised generation response' });
  });
});
