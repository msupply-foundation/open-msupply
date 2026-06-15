package org.openmsupply.client;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.webkit.WebView;

import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.ViewModel;
import androidx.lifecycle.ViewModelProvider;

import com.getcapacitor.BridgeActivity;
import java.io.File;



public class MainActivity extends BridgeActivity {
    RemoteServer server = new RemoteServer();
    DiscoveryConstants discoveryConstants;
    private FileManager fileManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeApi.class);
        registerPlugin(HoneywellScannerPlugin.class);
        super.onCreate(savedInstanceState);

        // Replace Capacitor's auto-loaded https://localhost:<PORT>/ with an inline
        // "Starting omSupply…" page. Without this, the WebView fires a GET against
        // a server that hasn't bound yet, which paints Chromium's native error page
        // and leaks through the brief window between splash dismissal and the real
        // /android URL finishing its load.
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new LoadingPage(this), "LoadingPageInject");
        webView.loadUrl(LoadingPage.URL);

        // The LoadingPage IS our loading UX now — release the native splash on the
        // next UI message (after loadData has been queued for rendering) so the
        // spinner becomes visible immediately rather than waiting for the readiness
        // poll to finish.
        webView.post(() -> AppState.getInstance().setWebViewReady(true));

        discoveryConstants = new DiscoveryConstants(getContentResolver());
        fileManager = new FileManager(this);

        // Set up an OnPreDrawListener to the root view
        // This holds the native splash up until the WebView has its initial
        // content (the LoadingPage), so there's no white flash on cold start.
        final View content = findViewById(android.R.id.content);
        content.getViewTreeObserver().addOnPreDrawListener(
                new ViewTreeObserver.OnPreDrawListener() {
                    @Override
                    public boolean onPreDraw() {
                        if (AppState.getInstance().isWebViewReady()) {
                            // The content is ready: start drawing
                            content.getViewTreeObserver().removeOnPreDrawListener(this);
                            return true;
                        } else {
                            // The content isn't ready. Suspend.
                            return false;
                        }
                    }
                });

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        server.start(discoveryConstants.PORT, path, cache, discoveryConstants.hardwareId);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }

    // ActivityResult needs to be overridden in the main, not UI thread
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        fileManager.onActivityResult(requestCode, resultCode, data);
    }

    // Implementing here, so that we can use the FileManager instance
    public void SaveFile(String filename, String content, String mimeType, String successMessage) {
        fileManager.Save(filename, content, mimeType, successMessage);
    }
    public void SaveBinaryFile(String filename, byte[] data, String mimeType, String successMessage) {
        fileManager.SaveBinaryFile(filename, data, mimeType, successMessage);
    }
    public void SaveDatabase(File file) {
        fileManager.SaveDatabase(file);
    }
}
