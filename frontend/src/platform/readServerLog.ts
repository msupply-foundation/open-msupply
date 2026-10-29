import { isAndroid } from './index';
import { saveStagedFile, type SaveBlobResult } from './openDocument';
import { t } from '../intl';

// Saving the embedded server's log where the server-log API can't be used —
// the initialisation screen, before there's an authenticated session
// (kdd/capacitor-plugins; spec/android § Files out of the app). The
// server-log GraphQL queries and GET /support/log need auth, and the GraphQL
// ones don't exist in the pre-init schema, so that screen saves the log file
// natively instead.
//
// Android only: the on-device server writes the file, and the ReadLog shell
// plugin copies <filesDir>/logs/remote_server.log into the cache. Off-device
// there is no such server, so this reports "not available" — the caller hides
// its affordance on the web (isAndroid() is false there too).

// Our own custom Capacitor plugin (android/.../ReadLogPlugin.java, registered
// in MainActivity). One proxy per session; registerPlugin is idempotent but we
// cache anyway (matches saveBlob's FileTransfer handling).
type ReadLogPlugin = {
  /**
   * Copies the active log into the cache dir: its file:// URI and
   * cache-relative path, or `error` when there's no log worth saving. The log
   * itself never crosses the bridge — it can be 50 MB (#1012).
   */
  stageLog(): Promise<{ uri?: string; path?: string; error?: string }>;
};
let readLogPlugin: ReadLogPlugin | undefined;

// Stage the server log and hand it to the platform save flow (Android SAF
// picker). One call for the init screen's "Save log" affordance. Returns a
// missing log as a SaveBlobResult error, so the caller surfaces one notice for
// both the "no log to save" and "save failed" cases; { ok: true, saved: false }
// means the user cancelled the save picker (declined, not failed).
export const saveServerLog = async (): Promise<SaveBlobResult> => {
  if (!isAndroid()) {
    // No embedded server off-device — nothing to save.
    return { ok: false, message: t('error.unable-to-load-server-log') };
  }
  try {
    if (!readLogPlugin) {
      const { registerPlugin } = await import('@capacitor/core');
      readLogPlugin = registerPlugin<ReadLogPlugin>('ReadLog');
    }
    // The plugin resolves { error } when the file is absent, empty or
    // unreadable (host-backend build, or logging not started yet).
    const { uri, path, error } = await readLogPlugin.stageLog();
    if (error || !uri || !path) {
      return { ok: false, message: t('error.unable-to-load-server-log') };
    }
    return saveStagedFile({ uri, path }, 'remote_server.log', 'text/plain');
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
};
