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
  { ok: true; fileId: string } | { ok: false; status: string };

/**
 * Stage the file on the server. Session-cookie auth, as every request this app
 * makes (same origin). Any non-200 is a failed upload described by its status
 * — an unauthenticated one is a 500 here, not a 401 (contract › file upload,
 * wire trap).
 */
export const uploadBundle = async (file: File): Promise<UploadResult> => {
  const formData = new FormData();
  formData.append('files', file);
  try {
    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      body: formData,
    });
    if (!response.ok) {
      return {
        ok: false,
        status: `${response.status} ${response.statusText}`.trim(),
      };
    }
    const body: unknown = await response.json();
    const fileId =
      typeof body === 'object' && body !== null && 'file-id' in body
        ? body['file-id']
        : undefined;
    return typeof fileId === 'string' && fileId.length > 0
      ? { ok: true, fileId }
      : { ok: false, status: `${response.status} — no file id` };
  } catch (error) {
    return {
      ok: false,
      status: error instanceof Error ? error.message : String(error),
    };
  }
};
