package org.openmsupply.client;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.util.Log;

import androidx.core.content.pm.PackageInfoCompat;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Copies the APK-bundled web UI (assets/public, populated by `cap copy`) to
 * <filesDir>/frontend, where the embedded server serves it from (see
 * `server.frontend_dir` in the server settings). The server binary no longer
 * embeds the frontend, so the app shell owns shipping it — LAN clients
 * connecting to this device still get this server's UI, same as before.
 *
 * Must run before RemoteServer.start so the server never serves a stale or
 * missing bundle. The copy only happens on first run and after an app
 * update; otherwise this is a SharedPreferences read.
 */
public class FrontendAssets {
    private static final String TAG = "FrontendAssets";
    private static final String ASSET_DIR = "public";
    private static final String FRONTEND_DIR = "frontend";
    private static final String PREFS = "frontend_assets";
    private static final String KEY_VERSION = "copied_version";

    public static void sync(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        File target = new File(context.getFilesDir(), FRONTEND_DIR);

        // Debug builds always refresh: the bundle changes without a version bump
        boolean debuggable = (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        String version = appVersion(context);
        boolean upToDate = !debuggable
                && version.equals(prefs.getString(KEY_VERSION, null))
                && target.isDirectory();
        if (upToDate) {
            return;
        }

        // Stage then swap, so an interrupted copy is redone on the next launch
        // (the version preference is only written after a complete copy)
        File staging = new File(context.getFilesDir(), FRONTEND_DIR + ".tmp");
        try {
            deleteRecursively(staging);
            copyAssetDir(context.getAssets(), ASSET_DIR, staging);
            deleteRecursively(target);
            if (!staging.renameTo(target)) {
                throw new IOException("could not move " + staging + " to " + target);
            }
            prefs.edit().putString(KEY_VERSION, version).apply();
            Log.i(TAG, "Copied web frontend " + version + " to " + target);
        } catch (IOException e) {
            // The server will serve its "Cannot find index.html" message;
            // recoverable on next launch
            Log.e(TAG, "Failed to copy web frontend", e);
        }
    }

    private static String appVersion(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return PackageInfoCompat.getLongVersionCode(info) + ":" + info.versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "unknown";
        }
    }

    private static void copyAssetDir(AssetManager assets, String assetPath, File target) throws IOException {
        String[] children = assets.list(assetPath);
        if (children == null || children.length == 0) {
            try {
                copyAssetFile(assets, assetPath, target);
            } catch (FileNotFoundException e) {
                // an empty directory: list() returns no children for both
                createDir(target);
            }
            return;
        }
        createDir(target);
        for (String child : children) {
            copyAssetDir(assets, assetPath + "/" + child, new File(target, child));
        }
    }

    private static void createDir(File dir) throws IOException {
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new IOException("could not create " + dir);
        }
    }

    private static void copyAssetFile(AssetManager assets, String assetPath, File target) throws IOException {
        try (InputStream in = assets.open(assetPath); OutputStream out = new FileOutputStream(target)) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }
    }

    private static void deleteRecursively(File file) {
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteRecursively(child);
            }
        }
        file.delete();
    }
}
