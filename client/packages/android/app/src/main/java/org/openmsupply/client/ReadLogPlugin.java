package org.openmsupply.client;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

/**
 * Reads the embedded server's current log file so it can be saved/shared from
 * a screen that has no authenticated GraphQL session — the initialisation and
 * login screens, where the server-log GraphQL API is unavailable (it needs
 * auth, and doesn't exist at all in the pre-initialisation schema).
 *
 * Used by the NEW front end (open-msupply-frontend), whose JS side is
 * src/platform/readServerLog.ts — it creates the proxy with
 * registerPlugin('ReadLog'). The read half of NativeApi.readLog, expressed as
 * a plain Capacitor plugin.
 *
 * Path — the ACTIVE log only (plain text; the rotated siblings are gzip):
 *   <filesDir>/logs/remote_server.log
 * The embedded Rust server writes there — server/android/src/android.rs sets
 * the log directory to files_dir.join("logs") and server/server/src/logging.rs
 * defaults the filename to remote_server.log. NB this is NOT <filesDir> root:
 * NativeApi.readLog still reads the old root path, which the server left when
 * it moved the log directory, so it reads nothing on a current server — do not
 * follow it.
 *
 * readLog() resolves { log } with the file's text, or { log: "", error } when
 * the file is absent/unreadable (e.g. logging not yet started) — never
 * rejects; the caller decides what an empty log means.
 */
@CapacitorPlugin(name = "ReadLog")
public class ReadLogPlugin extends Plugin {

    private static final String LOG_DIR_NAME = "logs";
    private static final String LOG_FILE_NAME = "remote_server.log";

    @PluginMethod
    public void readLog(PluginCall call) {
        JSObject ret = new JSObject();
        File logsDir = new File(getContext().getFilesDir(), LOG_DIR_NAME);
        File file = new File(logsDir, LOG_FILE_NAME);

        if (!file.exists()) {
            ret.put("log", "");
            ret.put("error", "Log file not found: " + file.getAbsolutePath());
            call.resolve(ret);
            return;
        }

        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
                sb.append("\n");
            }
            ret.put("log", sb.toString());
        } catch (IOException e) {
            ret.put("log", "");
            ret.put("error", e.getMessage());
        }
        call.resolve(ret);
    }
}
