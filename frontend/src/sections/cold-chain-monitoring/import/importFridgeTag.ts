import { FRIDGE_TAG_URL } from '@/config';

// The fridge-sensor file import (spec/cold-chain-monitoring rules › importing
// a fridge-sensor file; contract › importing a fridge-sensor file). NOT
// GraphQL: a multipart POST to the server's `/fridge-tag` route, authenticated
// by the same-origin session cookie, following the sync-files upload
// (src/domain/syncFiles.ts) and the help-document upload precedent. The
// outcome classification is pure and unit-tested; the request is a thin
// wrapper around fetch.

/**
 * The route accepts plain-text and comma-separated files (rules). The chooser
 * is restricted to these; the server itself decides the parser by file NAME
 * and admits any content (contract ⚠️ wire trap).
 */
export const ACCEPTED_FILE_TYPES = '.txt,.csv';

/** The multipart field the route reads the file from. */
export const FILE_FIELD = 'files';

/** The upload URL for a store — `store-id` is the route's query parameter. */
export const importUrl = (storeId: string): string =>
  `${FRIDGE_TAG_URL}?store-id=${encodeURIComponent(storeId)}`;

/** The route's 200 body. `newSensorId` is null when the file's sensor already
 *  existed — import is idempotent by the file's own identifiers (rules). */
export type ImportResponse = {
  newSensorId: string | null;
  numberOfLogs: number;
  numberOfBreaches: number;
  startDatetime: string | null;
  endDatetime: string | null;
};

/** Readings and/or breaches were taken in (`.34`). */
export type ImportedOutcome = { kind: 'imported'; response: ImportResponse };
/**
 * A 200 that took in neither readings nor breaches — treated as a FAILURE,
 * not an empty success (rules; `.35`). This is the client's reading of an
 * otherwise-successful response, and it is what an unparseable file
 * produces too: no file content reaches the server's failure branch
 * (contract ⚠️ wire trap; `.36`).
 */
export type EmptyOutcome = { kind: 'empty'; response: ImportResponse };
/** A non-200, carrying the server's plain-text reason verbatim (`.36`). */
export type FailedOutcome = { kind: 'failed'; message: string };

export type ImportOutcome = ImportedOutcome | EmptyOutcome | FailedOutcome;

// Narrowing accessors for the screen's `<Match when={…}>` blocks: each answers
// the member or null, so a match renders the narrowed value without a cast
// (kdd/type-safety — `as` stays out of the vertical).
export const importedOf = (outcome: ImportOutcome): ImportedOutcome | null =>
  outcome.kind === 'imported' ? outcome : null;
export const failedOf = (outcome: ImportOutcome): FailedOutcome | null =>
  outcome.kind === 'failed' ? outcome : null;

/** A 200 response → imported or empty, on the two counts alone. */
export const classifyResponse = (response: ImportResponse): ImportOutcome =>
  response.numberOfLogs === 0 && response.numberOfBreaches === 0
    ? { kind: 'empty', response }
    : { kind: 'imported', response };

/**
 * Upload one file for the active store. Never throws: every failure is a
 * `failed` outcome carrying whatever reason is available — the server's
 * plain-text body for a non-200 (reaching the user unmodified and
 * untranslated, per ui-surface S4), the transport's message otherwise.
 */
export const importFridgeTag = async (
  storeId: string,
  file: File
): Promise<ImportOutcome> => {
  const body = new FormData();
  body.append(FILE_FIELD, file, file.name);
  let response: Response;
  try {
    response = await fetch(importUrl(storeId), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      body,
    });
  } catch (e) {
    return {
      kind: 'failed',
      message: e instanceof Error ? e.message : String(e),
    };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { kind: 'failed', message: text || `HTTP ${response.status}` };
  }
  try {
    return classifyResponse((await response.json()) as ImportResponse);
  } catch (e) {
    return {
      kind: 'failed',
      message: e instanceof Error ? e.message : String(e),
    };
  }
};
