// POST files to one of the server's REST upload routes (not GraphQL): the
// sync-file store, the fridge-tag import and `/upload` (`uploadFile` below).
// Each is a multipart body with the files under one field, the session cookie
// (same origin, as the GraphQL client) and a JSON answer. Never throws: a
// transport failure comes back as `unreachable`, and what a response means is
// the caller's — each route answers in its own shape. Extracted at the third
// identical copy (rule of three).

import { reportUnauthenticated } from '@/auth/authContext';
import { UPLOAD_URL } from '@/config';

export const FILES_FIELD = 'files';

/**
 * The largest file `/upload` will take. The route registers no
 * `MultipartFormConfig`, so actix's default total of 50 MiB applies and a
 * larger body is refused with a bare 400 that names neither the size nor the
 * file, so every dialog refuses such a file before sending.
 *
 * Not to be confused with `static_files.rs`'s `total_limit(100 * 1024 * 1024)`
 * — that is the sync-file route, and it does not reach here.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type PostFilesResult =
  | { kind: 'response'; response: Response }
  | { kind: 'unreachable'; message: string };

export const postFiles = async (
  url: string,
  files: readonly File[]
): Promise<PostFilesResult> => {
  const body = new FormData();
  for (const file of files) body.append(FILES_FIELD, file, file.name);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      body,
    });
    return { kind: 'response', response };
  } catch (error) {
    return {
      kind: 'unreachable',
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

/**
 * The `/upload` answer's single key, read defensively. It is hyphenated —
 * `file-id`, not `file_id` — because the Rust struct is kebab-cased.
 */
export const readFileId = (payload: unknown): string | undefined => {
  if (typeof payload !== 'object' || payload === null) return undefined;
  const value = (payload as Record<string, unknown>)['file-id'];
  return typeof value === 'string' && value !== '' ? value : undefined;
};

export type UploadOutcome =
  { kind: 'uploaded'; fileId: string } | { kind: 'failed'; message: string };

// `/upload`'s refusal of a request with no session: a 500 with this plain
// text, not a 401. A 401 is read the same way, should the route ever answer
// one.
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
 * Send one file to `/upload` and learn its server-side id. A failure's message
 * is the status, then the server's own text when it sent a short one.
 *
 * The upload is not a GraphQL call, so graphqlFetch never sees its session
 * end: a signed-out answer is reported here, and the app's re-login modal
 * opens over whatever sent the file.
 */
export const uploadFile = async (file: File): Promise<UploadOutcome> => {
  const posted = await postFiles(UPLOAD_URL, [file]);
  if (posted.kind === 'unreachable')
    return { kind: 'failed', message: posted.message };

  const { response } = posted;
  if (!response.ok) {
    const status = `${response.status} ${response.statusText}`.trim();
    const reason = shortReason(await response.text().catch(() => ''));
    if (
      response.status === 401 ||
      (response.status === 500 && reason === SIGNED_OUT_TEXT)
    )
      reportUnauthenticated();
    return {
      kind: 'failed',
      message: reason ? `${status}: ${reason}` : status,
    };
  }
  const fileId = readFileId(await response.json().catch(() => undefined));
  return fileId
    ? { kind: 'uploaded', fileId }
    : { kind: 'failed', message: `${response.status} — no file id` };
};
