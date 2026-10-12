import { UPLOAD_URL } from '@/config';
import { postFiles } from '@/api/postFiles';
import type { GraphqlResult } from '@/api/graphql';
import type { InstallUploadedReportsResult } from './manageReports.generated';

// Installing a report bundle (spec/manage-reports rules.md § installing,
// contract.md § installing). Two steps, and BOTH must succeed before anything
// is reported as installed: the file reaches the server over REST, then that
// identified file is installed over GraphQL. A transferred-but-not-installed
// file changes nothing (OMS-REG-MNG-06.23).
//
// Pure except for the fetch itself, so the outcome mapping is unit-testable
// without a server.

/**
 * The largest file `/upload` will take. The route registers no
 * `MultipartFormConfig`, so actix's default total of 50 MiB applies and a
 * larger body is refused with a bare 400 that names neither the size nor the
 * file (contract.md § /upload body size). The dialog refuses such a file
 * before sending (OMS-REG-MNG-06.27).
 *
 * Not to be confused with `static_files.rs`'s `total_limit(100 * 1024 * 1024)`
 * — that is the sync-file route, and it does not reach here.
 */
export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024;

/** The transfer step's outcome. */
export type UploadOutcome =
  { kind: 'uploaded'; fileId: string } | { kind: 'failed'; message: string };

/**
 * Transfer one file and learn its server-side id.
 *
 * The response key is hyphenated — `file-id`, not `file_id` — because the
 * Rust struct carries `#[serde(rename_all = "kebab-case")]` (contract.md §
 * installing). Reading the snake_case name would silently yield undefined.
 *
 * The endpoint answers **HTTP 500** for "not logged in" rather than 401, so a
 * status check must not read 401 as the signed-out signal (contract.md ⚠️).
 * Any non-OK status is reported as a failed transfer; the session-expiry path
 * is the GraphQL client's job, not this endpoint's.
 */
export const uploadReportFile = async (file: File): Promise<UploadOutcome> => {
  // The transport is the shared one — same route, same multipart field, same
  // never-throwing contract as the plugin bundle and sync-file uploads
  // (`api/postFiles.ts`). Only what the answer MEANS is this vertical's.
  const posted = await postFiles(UPLOAD_URL, [file]);
  if (posted.kind === 'unreachable')
    return { kind: 'failed', message: posted.message };

  const { response } = posted;
  if (!response.ok)
    return { kind: 'failed', message: `HTTP ${response.status}` };
  try {
    const fileId = readFileId(await response.json());
    return fileId
      ? { kind: 'uploaded', fileId }
      : { kind: 'failed', message: 'missing file-id' };
  } catch (e) {
    // A 200 whose body is not JSON: still a failed transfer, since no file-id
    // can be read from it.
    return {
      kind: 'failed',
      message: e instanceof Error ? e.message : String(e),
    };
  }
};

/** The upload response's single hyphenated key, read defensively. */
export const readFileId = (payload: unknown): string | undefined => {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const value = (payload as Record<string, unknown>)['file-id'];
  return typeof value === 'string' && value !== '' ? value : undefined;
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
