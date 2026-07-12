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
        super.onCreate(savedInstanceState);

        // SPIKE ONLY: trust any cert so fetch() from the capacitor origin can
        // reach the embedded server's self-signed https. The real app ports
        // CertWebViewClient (validate local cert + TOFU for remote servers).
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                android.util.Log.w("OMSSpike", "Proceeding through SSL error for: " + error.getUrl());
                handler.proceed();
            }
        });

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
            android.util.Log.e("OMSSpike", "Failed to copy asset " + assetPath, e);
        }
    }

    @Override
    public void onDestroy() {
        server.stop();
        super.onDestroy();
    }
}
