import { isAndroid } from './index';
import { saveBlob, type SaveBlobResult } from './openDocument';
import { t } from '../intl';

// Reading the embedded server's log where the GraphQL server-log API can't be
// used — the initialisation and login screens, before there's an authenticated
// session (kdd/capacitor-plugins; spec/android § Files out of the app). The
// server-log GraphQL queries need auth and don't exist in the pre-init schema,
// so those screens read the log file natively instead.
//
// Android only: the on-device server writes the file, and the ReadLog shell
// plugin reads <filesDir>/logs/remote_server.log. Off-device there is no such
// server, so this is a no-op that reports "not available" — the caller hides
// its affordance on the web (isAndroid() is false there too).

export type ReadLogResult =
  { ok: true; log: string } | { ok: false; message: string };

// Our own custom Capacitor plugin (android/.../ReadLogPlugin.java, registered
// in MainActivity). One proxy per session; registerPlugin is idempotent but we
// cache anyway (matches saveBlob's SaveFile handling).
type ReadLogPlugin = {
  readLog(): Promise<{ log: string; error?: string }>;
};
let readLogPlugin: ReadLogPlugin | undefined;

export const readServerLog = async (): Promise<ReadLogResult> => {
  if (!isAndroid()) {
    // No embedded server off-device — nothing to read.
    return { ok: false, message: t('error.unable-to-load-server-log') };
  }
  try {
    if (!readLogPlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      readLogPlugin = registerPlugin<ReadLogPlugin>('ReadLog');
    }
    const { log, error } = await readLogPlugin.readLog();
    // The plugin resolves { log: "", error } when the file is absent/unreadable
    // (host-backend build, or logging not started yet) — an empty log is not a
    // useful file to save, so surface it as the same "no log" message.
    if (error || log.trim() === '') {
      return { ok: false, message: t('error.unable-to-load-server-log') };
    }
    return { ok: true, log };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};

// Read the server log and hand it to the platform save flow (Android SAF
// picker). One call for the init/login "Save log" affordance. Returns the
// read failure as a SaveBlobResult error so the caller surfaces one notice for
// both the "no log to save" and "save failed" cases; { ok: true, saved: false }
// means the user cancelled the save picker (declined, not failed).
export const saveServerLog = async (): Promise<SaveBlobResult> => {
  const read = await readServerLog();
  if (!read.ok) return { ok: false, message: read.message };
  const blob = new Blob([read.log], { type: 'text/plain' });
  return saveBlob(blob, 'remote_server.log');
};
