package org.openmsupply.client;

import android.net.http.SslError;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity implements DiscoveryHostActivity {
    private static final int SERVER_PORT = 8000;
    private final RemoteServer server = new RemoteServer();

    // Host-initiated navigations (the client-mode boot, every
    // DiscoveryHostPlugin.navigate, the failed-load recovery below) are each
    // a fresh start: once the target page has loaded, drop the WebView
    // history beneath it. Otherwise hardware back resurrects a dead document
    // (the serverless bundled app under the discovery page) or re-enters
    // discovery WITHOUT ?autoconnect=false — which immediately reconnects to
    // the just-remembered server, the bounce AC-DT16 forbids. With history
    // pinned to the current page, back falls through to the App plugin's
    // default (leave the app); the designed way back — the login hand-off's
    // discovery-return link — carries autoconnect=false. Set on and read
    // from the UI thread.
    private String pendingHistoryClearPrefix;

    // Client mode = no embedded server library and not the dev-server loop.
    // Decided once in onCreate; read by the failed-load duty and by the
    // session clear in onDestroy.
    private boolean clientMode;

    @Override
    public void clearHistoryWhenLoaded(String urlPrefix) {
        pendingHistoryClearPrefix = urlPrefix;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom CAPACITOR plugins register here, before super.onCreate —
        // native bridge modules, nothing to do with open-mSupply's own plugin
        // system (kdd/plugin-loading). This list is also the custom half of
        // the future client-mode injection list (kdd/capacitor-plugins
        // Fork 5) — keep it complete.
        registerPlugin(FileTransferPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(ReadLogPlugin.class);
        registerPlugin(DiscoveryHostPlugin.class);

        super.onCreate(savedInstanceState);

        // Client mode: no embedded server, and not the dev-server loop. The
        // launch decision then belongs to the platform, not the bundled app.
        this.clientMode = !this.server.isAvailable() && this.bridge.getConfig().getServerUrl() == null;
        boolean clientMode = this.clientMode;
        String discoveryUrl = this.bridge.getLocalUrl() + "/discovery.html";

        // SPIKE ONLY (SSL): trust any cert so fetch() from the capacitor
        // origin can reach the embedded server's self-signed https. The real
        // app ports CertWebViewClient (validate local cert + TOFU for remote
        // servers).
        this.bridge.setWebViewClient(new BridgeWebViewClient(this.bridge) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                android.util.Log.w("OpenMSupply", "Proceeding through SSL error for: " + error.getUrl());
                handler.proceed();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // clearHistory only drops committed entries, so it must run
                // after the target page loads — matched by prefix because the
                // final URL can carry a query or a same-origin redirect.
                if (MainActivity.this.pendingHistoryClearPrefix != null
                        && url != null
                        && url.startsWith(MainActivity.this.pendingHistoryClearPrefix)) {
                    view.clearHistory();
                    MainActivity.this.pendingHistoryClearPrefix = null;
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // Host duty (src/discovery/hostContract.ts, AC-DT4): a
                // connected server whose UI fails to load must land back on
                // app-owned content — the discovery page, with the
                // could-not-connect notice seeded (?timedout) and autoconnect
                // off. Main frame only (a failed subresource is the page's
                // own business), client mode only (a local-mode fetch error
                // must never yank the bundled app to discovery), and never
                // for the local origin itself — that is a packaging fault a
                // reload cannot fix, not a server failure, so reloading would
                // just loop.
                if (!clientMode || !request.isForMainFrame()) return;
                if (request.getUrl().toString().startsWith(MainActivity.this.bridge.getLocalUrl())) return;
                MainActivity.this.clearHistoryWhenLoaded(discoveryUrl);
                view.loadUrl(discoveryUrl + "?autoconnect=false&timedout=true");
            }
        });

        // Client mode boot: load the discovery page (a second page of the
        // bundled app build, served at /discovery.html — spec/desktop's
        // Android sibling: spec/android § launch). The page itself decides
        // whether to auto-connect to a remembered server or list the LAN
        // (src/discovery/DiscoveryPage.tsx); DiscoveryHostPlugin answers its
        // hostInfo/browse/probe/navigate calls. The dev-server loop
        // (server.url set) keeps its current boot — the vite origin serves
        // the discovery page at the same /discovery.html for hand-testing
        // instead.
        if (clientMode) {
            this.clearHistoryWhenLoaded(discoveryUrl);
            this.bridge.getWebView().post(() -> {
                // Abort the default boot (the bundled app, which has no server
                // to talk to in client mode) before it commits: discovery is
                // the sole history entry and the doomed bundle never flashes.
                this.bridge.getWebView().stopLoading();
                this.bridge.getWebView().loadUrl(discoveryUrl);
            });
        }

        // Embedded server, only when its library is bundled (manually sourced
        // into jniLibs — the host-backend dev loop runs without it).
        if (server.isAvailable()) {
            // Fork 5B: the shell provides the UI. Copy the APK's bundled web
            // assets to filesDir/frontend, which the (embed-free) server serves
            // via its frontend_dir setting. Spike: copies every launch.
            copyAssetDir("public", new java.io.File(getFilesDir(), "frontend"));

            String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
            server.start(
                SERVER_PORT,
                getFilesDir().getAbsolutePath(),
                getCacheDir().getAbsolutePath(),
                androidId
            );
        }
    }

    private void copyAssetDir(String assetPath, java.io.File dest) {
        try {
            String[] children = getAssets().list(assetPath);
            if (children == null || children.length == 0) {
                dest.getParentFile().mkdirs();
                try (java.io.InputStream in = getAssets().open(assetPath);
                     java.io.OutputStream out = new java.io.FileOutputStream(dest)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
            } else {
                for (String child : children) {
                    copyAssetDir(assetPath + "/" + child, new java.io.File(dest, child));
                }
            }
        } catch (java.io.IOException e) {
            android.util.Log.e("OpenMSupply", "Failed to copy asset " + assetPath, e);
        }
    }

    @Override
    public void onDestroy() {
        // Host duty (src/discovery/hostContract.ts, AC-DT18): the session ends
        // with the app. In client mode the session belongs to the connected
        // server and lives in the WebView's cookie jar, which otherwise
        // survives to the next launch — so signing in would NOT be required
        // after the auto-reconnect AC-DT1 performs. Clearing all cookies (not
        // just the non-persistent ones) matches what the Electron shell does
        // on window close, and in client mode the only origins with cookies
        // here are servers. Local mode keeps its own cookies: its session is
        // the device's, not a chosen server's.
        //
        // onDestroy is not guaranteed on a process kill; the same is true of
        // the Electron close handler, and the server's own token expiry is
        // the backstop in both.
        if (this.clientMode) {
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
        }
        server.stop();
        super.onDestroy();
    }
}
