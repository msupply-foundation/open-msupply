import type { GraphqlResult } from '@/api/graphql';
import type { FileLike, FileRejection } from '@/ui/elements/inputs/uploadFiles';
import type { InstallUploadedReportsResult } from './manageReports.generated';

// Installing a report bundle (spec/manage-reports rules.md § installing,
// contract.md § installing). Two steps, and BOTH must succeed before anything
// is reported as installed: the file reaches the server over REST, then that
// identified file is installed over GraphQL. A transferred-but-not-installed
// file changes nothing (OMS-REG-MNG-06.23).
//
// Pure: the dialog makes both calls, the upload through api/postFiles.ts's
// `uploadFile`, so the outcome mapping is unit-testable without a server.

/** What one pick in the upload dialog does to the chosen files. */
export type PickOutcome<T> =
  /**
   * The files taken, which become the whole selection. `tooLarge` names a
   * file from the same pick that was refused for its size.
   */
  | { kind: 'accepted'; files: T[]; tooLarge?: string }
  /** A name not ending in "json": the whole pick is refused. */
  | { kind: 'invalidName' }
  /** Every file in the pick was over the size limit: nothing is taken. */
  | { kind: 'tooLarge'; fileName: string }
  /** A drop that carried nothing — leaves everything as it was. */
  | { kind: 'empty' };

/**
 * Judge one pick, given the upload zone's split of it (rules.md § choosing
 * the files).
 *
 * The NAME is judged on the whole pick: one name not ending in "json" refuses
 * all of it, and the files already chosen stay as they were
 * (OMS-REG-MNG-06.29). The test is the reference app's own — a name ending in
 * "json" passes, extension or not (OMS-REG-MNG-06.30).
 *
 * The SIZE is judged per file, as every size-limited upload in both apps
 * does: a file over the limit is refused and the rest of the pick is still
 * taken (OMS-REG-MNG-06.27, .34).
 *
 * Whatever is taken REPLACES the files already chosen rather than adding to
 * them (OMS-REG-MNG-06.33).
 */
export const judgePick = <T extends FileLike>(
  accepted: T[],
  rejected: FileRejection<T>[]
): PickOutcome<T> => {
  const all = [...accepted, ...rejected.map(r => r.file)];
  if (all.length === 0) return { kind: 'empty' };
  if (all.some(file => !file.name.endsWith('json')))
    return { kind: 'invalidName' };
  const tooLarge = rejected.find(r => r.reason === 'size')?.file.name;
  if (accepted.length === 0 && tooLarge)
    return { kind: 'tooLarge', fileName: tooLarge };
  return { kind: 'accepted', files: accepted, tooLarge };
};

/** The install step's outcome, per file. */
export type InstallOutcome =
  | { kind: 'installed'; reportIds: string[] }
  /**
   * The server could not read the file, carrying its own words. The rejection
   * is untyped and the three possible causes are indistinguishable, so the
   * description is passed through rather than recognised
   * (OMS-REG-MNG-06.26).
   */
  | { kind: 'rejected'; serverError: string }
  /** Transport or an already-reported failure — the global modal owns it. */
  | { kind: 'failed' };

/**
 * Map the install mutation's result.
 *
 * `installUploadedReports` has NO typed errors: a body that is not a bundle, a
 * body that is not parseable, and an unknown file id all arrive as the SAME
 * untyped `Internal error` (contract.md § rejections). They are therefore
 * indistinguishable here by construction — one `rejected` outcome covers all
 * three, and the dialog cannot tell the user which applied
 * (OMS-REG-MNG-06.15).
 */
export const installOutcome = (
  result: GraphqlResult<InstallUploadedReportsResult>
): InstallOutcome => {
  if (result.kind === 'success') {
    return {
      kind: 'installed',
      reportIds: result.data.centralServer.reports.installUploadedReports,
    };
  }
  // A GraphQL-level error the caller opted to receive: the only domain
  // rejection this mutation has.
  if (result.kind === 'graphqlError') {
    const details = result.errors[0]?.extensions?.details;
    return {
      kind: 'rejected',
      serverError:
        typeof details === 'string' && details.length > 0
          ? details
          : (result.errors[0]?.message ?? 'UnknownError'),
    };
  }
  return { kind: 'failed' };
};

/**
 * The outcome of installing a whole selection, file by file.
 *
 * Each file is transferred and installed INDEPENDENTLY, so an earlier file's
 * reports stay installed when a later one fails (rules.md § installing,
 * OMS-REG-MNG-06.16). This records both halves so the dialog can say what
 * arrived as well as what did not.
 */
export type BatchOutcome = {
  /** Ids of every report installed across all files that succeeded. */
  installedReportIds: string[];
  /** Names of the files that failed, in the order supplied. */
  failedFiles: string[];
};

export const emptyBatch = (): BatchOutcome => ({
  installedReportIds: [],
  failedFiles: [],
});

/** Fold one file's result into the running batch outcome. */
export const addToBatch = (
  batch: BatchOutcome,
  fileName: string,
  outcome: InstallOutcome
): BatchOutcome =>
  outcome.kind === 'installed'
    ? {
        ...batch,
        installedReportIds: [...batch.installedReportIds, ...outcome.reportIds],
      }
    : { ...batch, failedFiles: [...batch.failedFiles, fileName] };

/** Nothing at all arrived. */
export const batchInstalledNothing = (batch: BatchOutcome): boolean =>
  batch.installedReportIds.length === 0;

/** Some arrived and some did not — the partial case worth reporting plainly. */
export const batchIsPartial = (batch: BatchOutcome): boolean =>
  batch.installedReportIds.length > 0 && batch.failedFiles.length > 0;

/**
 * What the dialog does once an attempt ends (rules.md § several files at
 * once). Re-reading the register and closing the dialog are SEPARATE: the
 * register is re-read whenever anything arrived, but the dialog closes only
 * when every file installed. A partial failure therefore refreshes behind a
 * dialog that stays open, with the chosen files and the server's words
 * (OMS-REG-MNG-06.16, .25, .26).
 */
export const attemptEnd = (
  batch: BatchOutcome
): { refresh: boolean; close: boolean } => ({
  refresh: !batchInstalledNothing(batch),
  close: batch.failedFiles.length === 0,
});
