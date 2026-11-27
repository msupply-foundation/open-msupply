import { describe, expect, it, vi } from 'vitest';
import { chooseOne, partitionFiles } from '@/ui/elements/inputs/uploadFiles';
import { MAX_UPLOAD_BYTES } from '@/api/postFiles';
import type { GraphqlResult } from '@/api/graphql';
import type { CentralDataImportResultFragment } from './centralData.generated';
import {
  IMPORT_ACCEPT,
  changeBadge,
  changeCount,
  describeFields,
  emptyFilters,
  errorsFileName,
  errorsFileOutcome,
  exportInputs,
  exportOutcome,
  hasFilters,
  importOutcome,
  pickRefusalMessage,
  previewNotice,
  refusalMessage,
  totals,
  unwrap,
} from './centralDataLogic';

// Anchors: spec/central-data/cases/OMS-REG-CDIO-01.

// A message reads as its key and values, so a test pins which message.
vi.mock('@/intl', () => ({
  t: (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  formatNumber: (n: number) => `#${n}`,
  formatFileSize: (bytes: number) => `${bytes} bytes`,
}));

const file = (name: string, size = 10) =>
  new File([new Uint8Array(size)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

const pick = (files: File[]) => {
  const { accepted, rejected } = partitionFiles(files, {
    accept: IMPORT_ACCEPT,
    maxSize: MAX_UPLOAD_BYTES,
  });
  return chooseOne(accepted, rejected);
};

const summary: CentralDataImportResultFragment = {
  __typename: 'CentralDataImportNode',
  tables: [
    {
      table: 'UNIT',
      inserted: 2,
      updated: 1,
      deleted: 1,
      unchanged: 5,
      errorCount: 0,
    },
  ],
  changes: [],
  errors: [],
  errorCount: 0,
};

describe('OMS-REG-CDIO-01.6 — a file over 50 MB is refused before upload', () => {
  it('pins the limit to the upload route default', () => {
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });

  it('refuses a file one byte over and names it, and takes one at the limit', () => {
    // A real 50 MB buffer is slow to allocate, so only the size is faked.
    const big = file('units.xlsx');
    Object.defineProperty(big, 'size', { value: MAX_UPLOAD_BYTES + 1 });
    expect(pick([big])).toEqual({
      kind: 'refused',
      rejection: { file: big, reason: 'size' },
    });

    const edge = file('units.xlsx');
    Object.defineProperty(edge, 'size', { value: MAX_UPLOAD_BYTES });
    expect(pick([edge]).kind).toBe('chosen');
  });

  it('names the file and the limit in the refusal', () => {
    expect(
      pickRefusalMessage({ file: file('big.xlsx'), reason: 'size' }, 100)
    ).toBe(
      'error.file-exceeds-size-limit {"filename":"big.xlsx","maxSize":"100 bytes"}'
    );
  });
});

describe('choosing a file', () => {
  it('refuses a file that is not .xlsx', () => {
    const csv = file('units.csv');
    expect(pick([csv])).toEqual({
      kind: 'refused',
      rejection: { file: csv, reason: 'type' },
    });
    expect(pickRefusalMessage({ file: csv, reason: 'type' }, 100)).toBe(
      'error.central-data-xlsx-only'
    );
  });

  it('takes one .xlsx file, in any letter case', () => {
    expect(pick([file('Units.XLSX')]).kind).toBe('chosen');
  });

  it('does nothing for an empty drop, or a drop of several files', () => {
    expect(pick([])).toEqual({ kind: 'none' });
    expect(pick([file('a.xlsx'), file('b.xlsx')])).toEqual({ kind: 'none' });
    expect(pick([file('a.xlsx'), file('b.csv')])).toEqual({ kind: 'none' });
  });
});

describe('reading a preview or import result', () => {
  it('OMS-REG-CDIO-01.12 — passes the per-table counts through', () => {
    expect(importOutcome({ kind: 'success', data: summary })).toEqual({
      kind: 'summary',
      summary,
    });
  });

  it('OMS-REG-CDIO-01.7 — reads too many rows with the count and the limit', () => {
    expect(
      importOutcome({
        kind: 'success',
        data: {
          __typename: 'CentralDataImportError',
          error: {
            __typename: 'CentralDataTooManyRows',
            description: 'too many',
            rowCount: 120000,
            maxRows: 100000,
          },
        },
      })
    ).toEqual({ kind: 'tooManyRows', rowCount: 120000, maxRows: 100000 });
  });

  it('OMS-REG-CDIO-01.64 — reads too many cells with the count and the limit', () => {
    expect(
      importOutcome({
        kind: 'success',
        data: {
          __typename: 'CentralDataImportError',
          error: {
            __typename: 'CentralDataTooManyCells',
            description: 'too many',
            cellCount: 6000000,
            maxCells: 5000000,
          },
        },
      })
    ).toEqual({ kind: 'tooManyCells', cellCount: 6000000, maxCells: 5000000 });
  });

  it("OMS-REG-CDIO-01.8 — reads an unreadable file with the reader's reason", () => {
    expect(
      importOutcome({
        kind: 'success',
        data: {
          __typename: 'CentralDataImportError',
          error: {
            __typename: 'CentralDataCannotReadFile',
            description: 'Zip error: invalid archive',
          },
        },
      })
    ).toEqual({ kind: 'unreadable', reason: 'Zip error: invalid archive' });
  });

  it('leaves transport and GraphQL failures to the global modal', () => {
    const failure: GraphqlResult<CentralDataImportResultFragment> = {
      kind: 'unexpectedError',
    };
    expect(importOutcome(failure)).toEqual({ kind: 'failed' });
  });

  it('lifts the result out of the namespaced response', () => {
    const lifted = unwrap(
      { kind: 'success', data: { inner: summary } },
      data => data.inner
    );
    expect(lifted).toEqual({ kind: 'success', data: summary });
  });
});

describe("the import card's refusal banner", () => {
  it('OMS-REG-CDIO-01.7, .64 — names the count and the limit', () => {
    expect(
      refusalMessage({ kind: 'tooManyRows', rowCount: 100001, maxRows: 100000 })
    ).toBe(
      'error.central-data-too-many-rows {"rowCount":"#100001","maxRows":"#100000"}'
    );
    expect(
      refusalMessage({
        kind: 'tooManyCells',
        cellCount: 6000000,
        maxCells: 5000000,
      })
    ).toBe(
      'error.central-data-too-many-cells {"cellCount":"#6000000","maxCells":"#5000000"}'
    );
  });

  it("OMS-REG-CDIO-01.8, .50 — gives the reader's reason, or asks for the file again", () => {
    expect(refusalMessage({ kind: 'unreadable', reason: 'Zip error' })).toBe(
      'error.central-data-unreadable {"reason":"Zip error"}'
    );
    expect(refusalMessage({ kind: 'expired' })).toBe(
      'error.central-data-upload-expired'
    );
  });
});

describe('OMS-REG-CDIO-01.18 — the import confirmation counts', () => {
  it('adds up new, updated and deleted rows across tables', () => {
    if (summary.__typename !== 'CentralDataImportNode') throw new Error();
    expect(totals(summary)).toEqual({ inserted: 2, updated: 1, deleted: 1 });
  });
});

describe('the preview card counts', () => {
  it('counts every change but unchanged rows for the Import button', () => {
    if (summary.__typename !== 'CentralDataImportNode') throw new Error();
    expect(changeCount(summary)).toBe(4);
  });
});

describe('OMS-REG-CDIO-01.212 — the preview card notice', () => {
  if (summary.__typename !== 'CentralDataImportNode') throw new Error();
  const unchanged = {
    ...summary,
    tables: summary.tables.map(table => ({
      ...table,
      inserted: 0,
      updated: 0,
      deleted: 0,
    })),
  };

  it('with changes and no errors, says the upload is ready to import', () => {
    expect(previewNotice(summary)).toBe('ready');
  });

  it('with no changes and no errors, says there is nothing to import', () => {
    expect(previewNotice(unchanged)).toBe('nothing-to-import');
  });

  it('with any row error, shows the errors instead', () => {
    expect(previewNotice({ ...summary, errorCount: 1 })).toBe('errors');
    expect(previewNotice({ ...unchanged, errorCount: 1 })).toBe('errors');
  });
});

describe('OMS-REG-CDIO-01.35 — the changed rows list', () => {
  it('shows each changed column from old to new, a blank cell as a dash, worded by the catalog', () => {
    expect(
      describeFields([
        { column: 'name', from: 'ml', to: 'mL' },
        { column: 'description', from: '', to: 'Liquid' },
      ])
    ).toBe(
      'label.central-data-field-change {"column":"⁨name⁩","from":"⁨ml⁩","to":"⁨mL⁩"}' +
        'label.central-data-field-change-separator' +
        'label.central-data-field-change {"column":"⁨description⁩","from":"⁨—⁩","to":"⁨Liquid⁩"}'
    );
    // Each value is isolated, so a right-to-left line can't reorder it.
    expect(
      describeFields([{ column: 'code', from: 'A1', to: 'B2' }])
    ).toContain('"from":"\u2068A1\u2069"');
  });
});

describe('OMS-REG-CDIO-01.96 — a restored user in the changed rows list', () => {
  it('badges a restore apart from an update, as a warning', () => {
    expect(changeBadge('RESTORED')).toEqual({
      labelKey: 'label.change-restored',
      tone: 'warning',
    });
    expect(changeBadge('UPDATED')).toEqual({
      labelKey: 'label.change-updated',
    });
    expect(changeBadge('UNCHANGED')).toBeUndefined();
  });
});

describe('the errors file', () => {
  it('OMS-REG-CDIO-01.45 — names it after the upload', () => {
    expect(errorsFileName('units.xlsx')).toBe('units (errors).xlsx');
    expect(errorsFileName('Units.XLSX')).toBe('Units (errors).xlsx');
  });

  it('OMS-REG-CDIO-01.50 — reads an expired upload, on import and on the errors file', () => {
    const expired = {
      __typename: 'CentralDataImportError' as const,
      error: {
        __typename: 'CentralDataUploadExpired' as const,
        description: 'gone',
      },
    };
    expect(importOutcome({ kind: 'success', data: expired })).toEqual({
      kind: 'expired',
    });
    expect(errorsFileOutcome({ kind: 'success', data: expired })).toEqual({
      kind: 'expired',
    });
  });

  it('reads the stored file, or a refusal as an import does', () => {
    expect(
      errorsFileOutcome({
        kind: 'success',
        data: { __typename: 'CentralDataExportNode', fileId: 'f1' },
      })
    ).toEqual({ kind: 'file', fileId: 'f1' });
    expect(
      errorsFileOutcome({
        kind: 'success',
        data: {
          __typename: 'CentralDataImportError',
          error: {
            __typename: 'CentralDataCannotReadFile',
            description: 'gone',
          },
        },
      })
    ).toEqual({ kind: 'unreadable', reason: 'gone' });
    expect(errorsFileOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});

describe('export filters', () => {
  it('OMS-REG-CDIO-01.46 — sends only ticked tables, search trimmed, status as a flag', () => {
    const untouched = emptyFilters();
    expect(exportInputs(untouched)).toEqual([]);
    expect(hasFilters(untouched)).toBe(false);

    const unit = (contains: string, status: 'ALL' | 'ACTIVE' | 'INACTIVE') => [
      { table: 'UNIT' as const, ticked: true, contains, status },
    ];
    expect(exportInputs(unit('  tab ', 'ACTIVE'))).toEqual([
      { table: 'UNIT', contains: 'tab', isActive: true },
    ]);
    expect(exportInputs(unit('   ', 'INACTIVE'))).toEqual([
      { table: 'UNIT', contains: null, isActive: false },
    ]);
    expect(exportInputs(unit('', 'ALL'))).toEqual([
      { table: 'UNIT', contains: null, isActive: null },
    ]);
    expect(hasFilters(unit('   ', 'ALL'))).toBe(false);
    expect(hasFilters(unit('', 'INACTIVE'))).toBe(true);
  });

  it('reads a refused export for too many rows', () => {
    expect(
      exportOutcome({
        kind: 'success',
        data: {
          __typename: 'CentralDataExportError',
          error: {
            __typename: 'CentralDataTooManyRows',
            description: 'too many',
            rowCount: 120000,
            maxRows: 100000,
          },
        },
      })
    ).toEqual({ kind: 'tooManyRows', rowCount: 120000, maxRows: 100000 });
    expect(
      exportOutcome({
        kind: 'success',
        data: { __typename: 'CentralDataExportNode', fileId: 'f1' },
      })
    ).toEqual({ kind: 'file', fileId: 'f1' });
  });
});
