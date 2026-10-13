import { describe, expect, it } from 'vitest';
import {
  addToBatch,
  attemptEnd,
  batchInstalledNothing,
  batchIsPartial,
  emptyBatch,
  installOutcome,
  judgePick,
  readFileId,
  MAX_BUNDLE_BYTES,
} from './reportInstall';
import { partitionFiles } from '@/ui/elements/inputs/uploadFiles';
import type { GraphqlResult } from '@/api/graphql';
import type { InstallUploadedReportsResult } from './manageReports.generated';

// Anchors: spec/manage-reports/cases/OMS-REG-MNG-06.
//   .9  — installing a bundle adds every report it contains
//   .15 — an unreadable file is rejected without identifying the cause
//   .16 — reports installed before a failure stay installed
//   .24 — the first failure ends the attempt
//   .25 — a failed attempt leaves the chosen files, ready to retry
//   .26 — a failure reports the server's own words
//   .23 — a file chosen but not confirmed leaves the register unchanged
//   .27 — a file over 50 MiB is refused before sending
//   .29 — a pick with a name not ending in "json" is refused whole
//   .30 — a name ending in "json" without a ".json" extension is accepted
//   .33 — an accepted pick replaces the files already chosen
//   .34 — the rest of a pick with an oversized file is still taken

const ok = (ids: string[]): GraphqlResult<InstallUploadedReportsResult> => ({
  kind: 'success',
  data: { centralServer: { reports: { installUploadedReports: ids } } },
});

const graphqlError = (
  details: string
): GraphqlResult<InstallUploadedReportsResult> => ({
  kind: 'graphqlError',
  message: 'Internal error',
  errors: [{ message: 'Internal error', extensions: { details } }],
});

describe('OMS-REG-MNG-06.9 — installing adds every report in the bundle', () => {
  it('reports every id the server upserted, not just the first', () => {
    const outcome = installOutcome(ok(['a_1_0_0_true', 'b_2_0_0_false']));
    expect(outcome).toEqual({
      kind: 'installed',
      reportIds: ['a_1_0_0_true', 'b_2_0_0_false'],
    });
  });

  it('reads the hyphenated file-id the transfer step returns', () => {
    // The Rust struct is kebab-cased, so the snake_case name is absent —
    // reading it would silently yield undefined (contract.md § installing).
    expect(readFileId({ 'file-id': 'abc' })).toBe('abc');
    // The snake_case name is NOT what the server sends — asserting that is
    // the whole point of this case, hence the rule exemption.
    // eslint-disable-next-line camelcase
    expect(readFileId({ file_id: 'abc' })).toBeUndefined();
    expect(readFileId({ 'file-id': '' })).toBeUndefined();
    expect(readFileId(null)).toBeUndefined();
  });
});

describe('OMS-REG-MNG-06.15 — every rejection is indistinguishable', () => {
  // A body that is not a bundle, a body that is not parseable, and an unknown
  // file id all arrive as the SAME untyped error, so the client cannot tell
  // the user which applied. One outcome covers all three by construction.
  it.each([
    ['not a report bundle', 'Invalid file'],
    ['not parseable at all', 'Invalid file'],
    ['unknown file id', 'Invalid file'],
  ])('maps "%s" onto one rejected outcome', (_case, details) => {
    expect(installOutcome(graphqlError(details))).toEqual({
      kind: 'rejected',
      serverError: 'Invalid file',
    });
  });

  it('keeps a transport failure distinct — the global modal owns that one', () => {
    expect(installOutcome({ kind: 'unexpectedError' })).toEqual({
      kind: 'failed',
    });
  });
});

describe('OMS-REG-MNG-06.16 / .24 — a failure ends the attempt', () => {
  it('keeps an earlier file’s reports when a later one fails', () => {
    let batch = emptyBatch();
    batch = addToBatch(batch, 'first.json', {
      kind: 'installed',
      reportIds: ['r1'],
    });
    batch = addToBatch(batch, 'second.json', {
      kind: 'rejected',
      serverError: 'Invalid file',
    });
    expect(batch.installedReportIds).toEqual(['r1']);
    expect(batch.failedFiles).toEqual(['second.json']);
    // The register HAS changed, so this is not a clean failure...
    expect(batchInstalledNothing(batch)).toBe(false);
    // ...but it is not a clean success either.
    expect(batchIsPartial(batch)).toBe(true);
  });

  it('records only one failed file — the rest are never attempted', () => {
    // The loop breaks on the first failure, so however many files were
    // chosen, a batch can hold at most ONE failed file.
    let batch = emptyBatch();
    batch = addToBatch(batch, 'first.json', {
      kind: 'installed',
      reportIds: ['r1'],
    });
    batch = addToBatch(batch, 'second.json', {
      kind: 'rejected',
      serverError: 'Invalid file',
    });
    expect(batch.failedFiles).toEqual(['second.json']);
    expect(batch.installedReportIds).toEqual(['r1']);
  });

  it('recognises a batch where nothing arrived', () => {
    const batch = addToBatch(emptyBatch(), 'only.json', {
      kind: 'rejected',
      serverError: 'Invalid file',
    });
    expect(batchInstalledNothing(batch)).toBe(true);
    expect(batchIsPartial(batch)).toBe(false);
  });

  it('recognises a batch where everything arrived', () => {
    const batch = addToBatch(emptyBatch(), 'only.json', {
      kind: 'installed',
      reportIds: ['r1', 'r2'],
    });
    expect(batchInstalledNothing(batch)).toBe(false);
    expect(batchIsPartial(batch)).toBe(false);
  });
});

describe('OMS-REG-MNG-06.25 / .26 — a failed attempt keeps the dialog open', () => {
  const rejected = { kind: 'rejected', serverError: 'Invalid file' } as const;

  it('re-reads the register but stays open when a later file fails', () => {
    // The partial case: refreshing and closing must not travel together, or
    // the dialog closes as a success and the failure notice is lost.
    let batch = addToBatch(emptyBatch(), 'first.json', {
      kind: 'installed',
      reportIds: ['r1'],
    });
    batch = addToBatch(batch, 'second.json', rejected);
    expect(attemptEnd(batch)).toEqual({ refresh: true, close: false });
  });

  it('stays open without re-reading when the first file fails', () => {
    const batch = addToBatch(emptyBatch(), 'only.json', rejected);
    expect(attemptEnd(batch)).toEqual({ refresh: false, close: false });
  });

  it('re-reads and closes only when every file installed', () => {
    let batch = addToBatch(emptyBatch(), 'first.json', {
      kind: 'installed',
      reportIds: ['r1'],
    });
    batch = addToBatch(batch, 'second.json', {
      kind: 'installed',
      reportIds: ['r2'],
    });
    expect(attemptEnd(batch)).toEqual({ refresh: true, close: true });
  });
});

describe('OMS-REG-MNG-06.23 — choosing a file installs nothing on its own', () => {
  it('starts from an empty batch, so an unconfirmed selection changes nothing', () => {
    // The transfer and the install are both driven by confirming; an
    // untouched batch is the state a cancelled dialog leaves behind.
    const batch = emptyBatch();
    expect(batch.installedReportIds).toEqual([]);
    expect(batch.failedFiles).toEqual([]);
    expect(batchInstalledNothing(batch)).toBe(true);
  });
});

describe('OMS-REG-MNG-06.27 — an oversized file is refused before sending', () => {
  it('matches the limit the upload route actually enforces', () => {
    // actix's default multipart total, which `/upload` never overrides. A
    // mismatch here means the dialog either refuses files the server would
    // have taken, or sends ones it refuses with a bare 400.
    expect(MAX_BUNDLE_BYTES).toBe(50 * 1024 * 1024);
  });

  it('partitions a file by that ceiling, naming size as the reason', () => {
    // The shared upload zone is handed MAX_BUNDLE_BYTES as its maxSize, so
    // this is the split the dialog's onPick receives.
    const under = { name: 'bundle.json', type: '', size: MAX_BUNDLE_BYTES };
    const over = { name: 'big.json', type: '', size: MAX_BUNDLE_BYTES + 1 };
    const { accepted, rejected } = partitionFiles([under, over], {
      maxSize: MAX_BUNDLE_BYTES,
    });
    expect(accepted).toEqual([under]);
    expect(rejected).toEqual([{ file: over, reason: 'size' }]);
  });

  it('refuses an oversized file on its own, naming it', () => {
    // Nothing else in the pick, so nothing is taken and the files already
    // chosen stay.
    const over = { name: 'big.json', type: '', size: MAX_BUNDLE_BYTES + 1 };
    expect(judgePick([], [{ file: over, reason: 'size' }])).toEqual({
      kind: 'tooLarge',
      fileName: 'big.json',
    });
  });
});

describe('OMS-REG-MNG-06.34 — the rest of a pick with an oversized file is still taken', () => {
  it('takes the files under the limit and names the one refused', () => {
    const under = { name: 'bundle.json', type: '', size: 10 };
    const over = { name: 'big.json', type: '', size: MAX_BUNDLE_BYTES + 1 };
    expect(judgePick([under], [{ file: over, reason: 'size' }])).toEqual({
      kind: 'accepted',
      files: [under],
      tooLarge: 'big.json',
    });
  });
});

const named = (name: string) => ({ name, type: '', size: 10 });

describe('OMS-REG-MNG-06.29 — a pick with a name not ending in "json" is refused whole', () => {
  it('refuses a pick mixing a bundle with a non-json name', () => {
    expect(judgePick([named('report.json'), named('notes.txt')], [])).toEqual({
      kind: 'invalidName',
    });
  });

  it('refuses on the name even when that file was also oversized', () => {
    const over = { name: 'big.txt', type: '', size: MAX_BUNDLE_BYTES + 1 };
    expect(judgePick([], [{ file: over, reason: 'size' }])).toEqual({
      kind: 'invalidName',
    });
  });
});

describe('OMS-REG-MNG-06.30 — a name ending in "json" passes, extension or not', () => {
  it('accepts a name with no ".json" extension', () => {
    const bare = named('bundlejson');
    expect(judgePick([bare], [])).toEqual({ kind: 'accepted', files: [bare] });
  });

  it('accepts a ".geojson" name', () => {
    const geo = named('reports.geojson');
    expect(judgePick([geo], [])).toEqual({ kind: 'accepted', files: [geo] });
  });
});

describe('OMS-REG-MNG-06.33 — an accepted pick replaces the files already chosen', () => {
  it('yields only the new pick, which the dialog sets as the chosen files', () => {
    // judgePick never sees the earlier selection: what it accepts IS the new
    // selection, so nothing from an earlier pick can carry over.
    const second = [named('b.json'), named('c.json')];
    expect(judgePick(second, [])).toEqual({ kind: 'accepted', files: second });
  });

  it('leaves the chosen files alone for a drop that carried nothing', () => {
    expect(judgePick([], [])).toEqual({ kind: 'empty' });
  });
});
