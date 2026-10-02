import { postFiles } from '@/api/postFiles';
import { UPLOAD_URL } from '@/config';
import type { FileLike, FileRejection } from '@/ui/elements/inputs/uploadFiles';

/*
 * Choosing and sending a bundle file (spec/plugin-management/rules.md ›
 * installing a bundle; contract.md › file upload).
 */

/** What the upload zone accepts — any letter case (the zone folds it). */
export const BUNDLE_ACCEPT = '.json';

/**
 * The server's form refuses a body past 50 MB (actix's default total), so the
 * dialog refuses such a file before sending anything (contract › file
 * upload).
 */
export const MAX_BUNDLE_BYTES = 50 * 1024 * 1024;

/** The outcome of one pick or one drop. */
export type BundleChoice<F> =
  | { kind: 'chosen'; file: F }
  | { kind: 'refused'; rejection: FileRejection<F> }
  /** Several files at once: none is chosen, and nothing is said. */
  | { kind: 'none' };

/**
 * One pick or drop, as the upload zone partitioned it. One file — accepted or
 * refused — is the only batch that decides anything: a drop of several, valid
 * or not, chooses none (rules › installing a bundle), so it never replaces the
 * file already chosen either.
 */
export const chooseBundle = <F extends FileLike>(
  accepted: readonly F[],
  rejected: readonly FileRejection<F>[]
): BundleChoice<F> => {
  if (accepted.length + rejected.length !== 1) return { kind: 'none' };
  const [file] = accepted;
  if (file) return { kind: 'chosen', file };
  const [rejection] = rejected;
  return rejection ? { kind: 'refused', rejection } : { kind: 'none' };
};

export type UploadResult =
  | { ok: true; fileId: string }
  | {
      ok: false;
      /** The status, then the server's own text when it sent a short one. */
      status: string;
      /** The session has ended — the caller asks the user to sign in again. */
      signedOut: boolean;
    };

// The route's refusal of a request with no session: a 500 with this plain
// text, not a 401 (contract › file upload, wire trap). A 401 is read the same
// way, should the route ever answer one.
const SIGNED_OUT_TEXT = 'You need to be logged in';

// A reason worth showing: one short line of plain text. Anything longer, or
// an HTML error page, is left out and the status stands alone.
const shortReason = (text: string): string | undefined => {
  const reason = text.trim();
  return reason && reason.length <= 200 && !/[\n<]/.test(reason)
    ? reason
    : undefined;
};

/**
 * Stage the file on the server, through the shared api/postFiles (session
 * cookie, as every request this app makes). Any non-200 is a failed upload
 * described by its status and the server's short reason (contract › file
 * upload).
 */
export const uploadBundle = async (file: File): Promise<UploadResult> => {
  const sent = await postFiles(UPLOAD_URL, [file]);
  if (sent.kind === 'unreachable')
    return { ok: false, status: sent.message, signedOut: false };
  const { response } = sent;
  if (!response.ok) {
    const status = `${response.status} ${response.statusText}`.trim();
    const reason = shortReason(await response.text().catch(() => ''));
    return {
      ok: false,
      status: reason ? `${status}: ${reason}` : status,
      signedOut:
        response.status === 401 ||
        (response.status === 500 && reason === SIGNED_OUT_TEXT),
    };
  }
  const body: unknown = await response.json().catch(() => undefined);
  const fileId =
    typeof body === 'object' && body !== null && 'file-id' in body
      ? body['file-id']
      : undefined;
  return typeof fileId === 'string' && fileId.length > 0
    ? { ok: true, fileId }
    : {
        ok: false,
        status: `${response.status} — no file id`,
        signedOut: false,
      };
};
