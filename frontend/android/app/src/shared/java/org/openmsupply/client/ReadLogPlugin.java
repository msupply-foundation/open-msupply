package org.openmsupply.client;

import android.net.Uri;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Stages the embedded server's current log file for saving from a screen that
 * has no authenticated session: the initialisation screen, where the
 * server-log GraphQL API and GET /support/log are unavailable (they need auth,
 * and the GraphQL one doesn't exist in the pre-initialisation schema). The
 * read half of the legacy shell's NativeApi.readLog, as a plain Capacitor
 * plugin (kdd/android/legacy-shell-triage.md § LoadingPage/ErrorPage — "the
 * log affordance survives via readLog"). JS side: src/platform/readServerLog.ts.
 *
 * Path — the ACTIVE log only (plain text; the rotated siblings are gzip):
 *   <filesDir>/logs/remote_server.log
 * The embedded Rust server writes there — server/android/src/android.rs sets
 * the log directory to files_dir.join("logs") and server/server/src/logging.rs
 * defaults the filename to remote_server.log. NB this is NOT <filesDir> root:
 * the legacy Java read the old root path and was never updated when the server
 * moved the directory (commit "fix file fir", Oct 2025), so it reads nothing on
 * a current server — do not follow it.
 *
 * stageLog() copies the log into the cache directory and resolves
 * { uri, path } (its file:// URI, and its path relative to the cache dir), for
 * JS to hand to FileTransfer.save and delete afterwards. The log is never read
 * into a string: it can be 50 MB (#1012), and a whole-file bridge message
 * runs the app out of memory (the payload rule, FileTransferPlugin). Resolves
 * { error } when the log is absent, empty or unreadable (e.g. host-backend
 * builds with no on-device server, or logging not yet started) — never
 * rejects.
 */
@CapacitorPlugin(name = "ReadLog")
public class ReadLogPlugin extends Plugin {

    private static final String LOG_DIR_NAME = "logs";
    private static final String LOG_FILE_NAME = "remote_server.log";
    // One staged copy at a time; each save overwrites the last one.
    private static final String STAGED_FILE_NAME = "staged-remote_server.log";

    @PluginMethod
    public void stageLog(PluginCall call) {
        JSObject ret = new JSObject();
        File logsDir = new File(getContext().getFilesDir(), LOG_DIR_NAME);
        File file = new File(logsDir, LOG_FILE_NAME);

        if (!file.exists() || file.length() == 0) {
            ret.put("error", "Log file not found or empty: " + file.getAbsolutePath());
            call.resolve(ret);
            return;
        }

        File staged = new File(getContext().getCacheDir(), STAGED_FILE_NAME);
        try (InputStream in = new FileInputStream(file);
             OutputStream out = new FileOutputStream(staged)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            ret.put("uri", Uri.fromFile(staged).toString());
            ret.put("path", STAGED_FILE_NAME);
        } catch (IOException e) {
            staged.delete();
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }
}
