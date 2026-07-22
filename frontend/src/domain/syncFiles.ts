import { SYNC_FILES_URL } from '../config';

// The sync-file store: per-record document attachments behind a REST endpoint
// (not GraphQL). Cookie-authenticated (same-origin session cookie), matching
// the GraphQL client. Mirrors the reference app's UploadDocumentModal / Footer
// (POST multipart to upload, GET to download, DELETE to remove). A consuming
// view refetches its record afterwards to pick up the new `documents` list.

const base = (tableName: string, recordId: string) =>
  `${SYNC_FILES_URL}/${tableName}/${recordId}`;

export type SyncFileResult = { ok: boolean; message?: string };

// Upload one or more files against a record. Field name "files" (the server
// accepts several per request).
export const uploadSyncFiles = async (
  tableName: string,
  recordId: string,
  files: File[]
): Promise<SyncFileResult> => {
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  try {
    const response = await fetch(base(tableName, recordId), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      body: formData,
    });
    return response.ok
      ? { ok: true }
      : { ok: false, message: `HTTP ${response.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

export const deleteSyncFile = async (
  tableName: string,
  recordId: string,
  fileId: string
): Promise<SyncFileResult> => {
  try {
    const response = await fetch(`${base(tableName, recordId)}/${fileId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    return response.ok
      ? { ok: true }
      : { ok: false, message: `HTTP ${response.status}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

// The download/open URL for a stored file (the panel renders the filename as a
// link to it).
export const syncFileUrl = (
  tableName: string,
  recordId: string,
  fileId: string
): string => `${base(tableName, recordId)}/${fileId}`;
