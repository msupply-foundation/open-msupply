package org.openmsupply.client;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.webkit.CookieManager;
import android.webkit.MimeTypeMap;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;

/**
 * File bytes in and out of the app, natively — the file half of the legacy
 * shell's FileManager/NativeApi as one plain Capacitor plugin
 * (kdd/android/legacy-shell-triage.md § FileManager). JS side:
 * src/platform/openDocument.ts (kdd/capacitor-plugins).
 *
 * Three methods, two directions:
 *  - download({ url, fileName }): server → cacheDir/fileName (overwriting),
 *    for handing to the OS viewer/share sheet. Resolves { uri, contentType }.
 *  - save({ srcUri, fileName, mimeType }): bytes the app already holds,
 *    staged by JS into a cache file — SAF ACTION_CREATE_DOCUMENT picker, then
 *    the staged file is copied to the user's pick.
 *  - saveFromUrl({ url, fileName, mimeType?, readTimeoutSeconds? }): a
 *    server-stored file — picker first, then streamed straight from the
 *    server into the pick. No cache file; a download that fails after the
 *    pick deletes the partial document and rejects. mimeType defaults from
 *    the fileName's extension. readTimeoutSeconds (default 30) exists for
 *    endpoints that work before their first byte — the database download
 *    VACUUMs server-side inside the request.
 *
 * Server requests carry the WebView's own session cookie (CookieManager holds
 * it, HttpOnly included). The save methods resolve { saved: true } once
 * written, { saved: false } when the user cancels the picker (not an error),
 * and reject only on a real failure.
 *
 * THE PAYLOAD RULE (#1169, kdd/capacitor-plugins Fork 6) — file bytes never
 * ride in a plugin call or a single bridge message:
 *  - While a picker is in front, Capacitor parcels the pending call's options
 *    into the activity's saved instance state (twice over), and Android caps
 *    that binder transaction at 1MB — an inline payload past a few hundred KB
 *    kills the whole app with TransactionTooLargeException on stop. The
 *    legacy FileManager hit the same wall carrying content in intent extras
 *    ("only works with small amounts of text!").
 *  - A whole-file bridge message is re-serialized on the Java heap
 *    (JSONObject.toString) — a 40MB document made a 75MB allocation:
 *    OutOfMemoryError. Hence native streaming for URL-addressed bytes and
 *    bounded-chunk staging (JS side) for JS-born bytes.
 */
@CapacitorPlugin(name = "FileTransfer")
public class FileTransferPlugin extends Plugin {

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        if (url == null || fileName == null) {
            call.reject("url and fileName are required");
            return;
        }
        // The JS side sanitizes names; this is defense in depth, since the
        // bridge is callable by any JS in the WebView and fileName lands in a
        // cacheDir path.
        if (fileName.contains("/") || fileName.contains("\\") || fileName.contains("..")) {
            call.reject("fileName must be a plain file name");
            return;
        }

        // Network on a worker thread — plugin methods can run on the main
        // thread, where URLConnection throws NetworkOnMainThreadException.
        getBridge().execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = openWithCookie(url, 30_000);
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) {
                    call.reject("HTTP " + code);
                    return;
                }

                File outFile = new File(getContext().getCacheDir(), fileName);
                try (
                    InputStream in = connection.getInputStream();
                    OutputStream out = new FileOutputStream(outFile)
                ) {
                    copy(in, out);
                }

                JSObject ret = new JSObject();
                ret.put("uri", Uri.fromFile(outFile).toString());
                ret.put("contentType", connection.getContentType());
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Failed to download file: " + e.getMessage(), e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @PluginMethod
    public void save(PluginCall call) {
        String srcUri = call.getString("srcUri");
        if (srcUri == null) {
            call.reject("srcUri (file URI of the staged bytes) is required");
            return;
        }
        // Same defense-in-depth reasoning as download's fileName check: the
        // bridge is callable by any JS in the WebView, and an unchecked
        // srcUri would read ANY app-private file into the user's pick. Only
        // staged cache files are legitimate sources.
        if (!isCacheFileUri(srcUri)) {
            call.reject("srcUri must be a file:// URI inside the cache directory");
            return;
        }
        launchPicker(call, "onSaveResult");
    }

    private boolean isCacheFileUri(String srcUri) {
        try {
            Uri uri = Uri.parse(srcUri);
            if (!"file".equals(uri.getScheme()) || uri.getPath() == null) return false;
            String canonical = new File(uri.getPath()).getCanonicalPath();
            String cacheDir = getContext().getCacheDir().getCanonicalPath();
            return canonical.startsWith(cacheDir + "/");
        } catch (Exception e) {
            return false;
        }
    }

    @PluginMethod
    public void saveFromUrl(PluginCall call) {
        if (call.getString("url") == null) {
            call.reject("url is required");
            return;
        }
        launchPicker(call, "onSaveFromUrlResult");
    }

    private void launchPicker(PluginCall call, String callbackName) {
        String fileName = call.getString("fileName", "file");
        String mimeType = call.getString("mimeType");
        if (mimeType == null) mimeType = mimeFromFileName(fileName);

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, callbackName);
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = pickedUri(call, result);
        if (uri == null) return;

        // Off the main thread — the activity callback lands there, and a
        // large copy into a slow DocumentsProvider (Drive, SD card) would
        // jank or ANR.
        getBridge().execute(() -> {
            try (
                InputStream in = getActivity().getContentResolver()
                        .openInputStream(Uri.parse(call.getString("srcUri")));
                OutputStream out = getActivity().getContentResolver().openOutputStream(uri)
            ) {
                copy(in, out);
                resolveSaved(call);
            } catch (Exception e) {
                // The pick created the document; don't leave a partial file
                // behind a failed copy.
                deleteDocumentQuietly(uri);
                call.reject("Failed to write file: " + e.getMessage(), e);
            }
        });
    }

    @ActivityCallback
    private void onSaveFromUrlResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = pickedUri(call, result);
        if (uri == null) return;

        Integer readTimeoutSeconds = call.getInt("readTimeoutSeconds");
        int readTimeoutMs =
            (readTimeoutSeconds == null ? 30 : readTimeoutSeconds) * 1000;

        // Network on a worker thread — activity callbacks land on main.
        getBridge().execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = openWithCookie(call.getString("url"), readTimeoutMs);
                int code = connection.getResponseCode();
                if (code < 200 || code >= 300) {
                    deleteDocumentQuietly(uri);
                    call.reject("HTTP " + code);
                    return;
                }
                try (
                    InputStream in = connection.getInputStream();
                    OutputStream out = getActivity().getContentResolver().openOutputStream(uri)
                ) {
                    copy(in, out);
                }
                resolveSaved(call);
            } catch (Exception e) {
                // The pick created the document; don't leave a partial file
                // behind a failed download.
                deleteDocumentQuietly(uri);
                call.reject("Failed to save file: " + e.getMessage(), e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    /** The user's pick, or null when they cancelled (resolves saved:false). */
    private Uri pickedUri(PluginCall call, ActivityResult result) {
        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() == Activity.RESULT_OK && uri != null) return uri;
        JSObject ret = new JSObject();
        ret.put("saved", false);
        call.resolve(ret);
        return null;
    }

    private void resolveSaved(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("saved", true);
        call.resolve(ret);
    }

    private void deleteDocumentQuietly(Uri uri) {
        try {
            DocumentsContract.deleteDocument(getActivity().getContentResolver(), uri);
        } catch (Exception ignored) {
        }
    }

    private static String mimeFromFileName(String fileName) {
        String extension = MimeTypeMap.getFileExtensionFromUrl(Uri.encode(fileName));
        String mimeType = extension == null
            ? null
            : MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension.toLowerCase());
        return mimeType == null ? "application/octet-stream" : mimeType;
    }

    private HttpURLConnection openWithCookie(String url, int readTimeoutMs)
            throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        if (connection instanceof HttpsURLConnection) {
            ensureLocalServerTrust();
            ((HttpsURLConnection) connection).setSSLSocketFactory(localTrustSocketFactory);
            ((HttpsURLConnection) connection).setHostnameVerifier(localTrustHostnameVerifier);
        }
        connection.setConnectTimeout(30_000);
        connection.setReadTimeout(readTimeoutMs);
        String cookie = CookieManager.getInstance().getCookie(url);
        if (cookie != null) connection.setRequestProperty("Cookie", cookie);
        return connection;
    }

    /*
     * Self-signed local-server trust. The embedded server serves https with a
     * self-signed certificate the WEBVIEW is taught to trust (the shell's SSL
     * error handling validates against the known cert file); URLConnection
     * needs the equivalent or every download/saveFromUrl on a
     * tablet-as-server device dies with SSLHandshakeException. Validation
     * mirrors the current app's CertWebViewClient.validateLocalCertificate:
     * normal system-CA trust first, otherwise accept exactly a peer
     * certificate that verifies against the known local server cert at
     * filesDir/certs/cert.pem (the file the server writes on startup). With
     * no cert file (a server-less APK, or client mode) behaviour is stock
     * system-CA trust. Remote self-signed servers (the legacy shell's TOFU
     * store) are NOT handled here — that travels with the client-mode port.
     */
    private SSLSocketFactory localTrustSocketFactory;
    private HostnameVerifier localTrustHostnameVerifier;

    private X509Certificate loadLocalServerCert() {
        File certFile = new File(getContext().getFilesDir(), "certs/cert.pem");
        if (!certFile.isFile()) return null;
        try (InputStream in = new BufferedInputStream(new FileInputStream(certFile))) {
            return (X509Certificate) CertificateFactory.getInstance("X.509")
                    .generateCertificate(in);
        } catch (Exception e) {
            return null;
        }
    }

    private static boolean verifiesAgainstLocal(X509Certificate peer, X509Certificate local) {
        if (peer == null || local == null) return false;
        try {
            peer.verify(local.getPublicKey());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private synchronized void ensureLocalServerTrust() throws Exception {
        if (localTrustSocketFactory != null) return;

        // Read once per plugin instance — the server writes the cert at
        // startup, before any UI that could call this plugin is served.
        final X509Certificate local = loadLocalServerCert();

        TrustManagerFactory factory =
                TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        factory.init((KeyStore) null);
        X509TrustManager found = null;
        for (TrustManager manager : factory.getTrustManagers()) {
            if (manager instanceof X509TrustManager) {
                found = (X509TrustManager) manager;
                break;
            }
        }
        final X509TrustManager system = found;

        X509TrustManager trustManager = new X509TrustManager() {
            @Override
            public void checkClientTrusted(X509Certificate[] chain, String authType)
                    throws CertificateException {
                system.checkClientTrusted(chain, authType);
            }

            @Override
            public void checkServerTrusted(X509Certificate[] chain, String authType)
                    throws CertificateException {
                try {
                    system.checkServerTrusted(chain, authType);
                } catch (CertificateException e) {
                    if (!verifiesAgainstLocal(chain[0], local)) throw e;
                }
            }

            @Override
            public X509Certificate[] getAcceptedIssuers() {
                return system.getAcceptedIssuers();
            }
        };

        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, new TrustManager[] { trustManager }, null);
        SSLSocketFactory socketFactory = context.getSocketFactory();

        // The local cert's hostname never matches how the app addresses the
        // server (localhost / a LAN IP), so pair the trust decision with the
        // same known-cert check at hostname verification.
        HostnameVerifier verifier = (hostname, session) -> {
            if (HttpsURLConnection.getDefaultHostnameVerifier().verify(hostname, session)) {
                return true;
            }
            try {
                return verifiesAgainstLocal(
                        (X509Certificate) session.getPeerCertificates()[0], local);
            } catch (Exception e) {
                return false;
            }
        };

        localTrustSocketFactory = socketFactory;
        localTrustHostnameVerifier = verifier;
    }

    private static void copy(InputStream in, OutputStream out) throws Exception {
        byte[] buffer = new byte[64 * 1024];
        int read;
        while ((read = in.read(buffer)) != -1) out.write(buffer, 0, read);
    }
}
