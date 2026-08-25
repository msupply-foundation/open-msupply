package org.openmsupply.client;

import android.net.http.SslError;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private static final int SERVER_PORT = 8000;
    private final RemoteServer server = new RemoteServer();

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Custom CAPACITOR plugins register here, before super.onCreate —
        // native bridge modules, nothing to do with open-mSupply's own plugin
        // system (kdd/plugin-loading). This list is also the custom half of
        // the future client-mode injection list (kdd/capacitor-plugins
        // Fork 5) — keep it complete.
        registerPlugin(SaveFilePlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(ReadLogPlugin.class);
        registerPlugin(NativeApiPlugin.class);

        super.onCreate(savedInstanceState);

        // SPIKE ONLY: trust any cert so fetch() from the capacitor origin can
        // reach the embedded server's self-signed https. The real app ports
        // CertWebViewClient (validate local cert + TOFU for remote servers).
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                android.util.Log.w("OpenMSupply", "Proceeding through SSL error for: " + error.getUrl());
                handler.proceed();
            }
        });

        // Client mode (no embedded server, not the dev-server loop): the
        // launch decision belongs to the platform, not the bundled app —
        // load the discovery page (bundled at /discovery/, spec/desktop's
        // Android sibling: spec/android § launch). The page itself decides
        // whether to auto-connect to a remembered server or list the LAN
        // (src/desktop/DiscoveryPage.tsx); NativeApiPlugin answers its
        // browse/connect calls. The dev-server loop (server.url set) keeps
        // its current boot — the vite origin serves the discovery page at
        // /discovery.html for hand-testing instead.
        if (!server.isAvailable() && bridge.getConfig().getServerUrl() == null) {
            String discovery = bridge.getLocalUrl() + "/discovery/index.html";
            bridge.getWebView().post(() -> bridge.getWebView().loadUrl(discovery));
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
        server.stop();
        super.onDestroy();
    }
}
