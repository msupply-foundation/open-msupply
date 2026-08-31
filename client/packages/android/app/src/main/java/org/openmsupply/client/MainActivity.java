package org.openmsupply.client;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.webkit.CookieManager;
import android.webkit.WebView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.io.File;



public class MainActivity extends BridgeActivity implements DiscoveryHostActivity {
    RemoteServer server = new RemoteServer();

    // Set by DiscoveryHostPlugin.navigate (host duty AC-DT16): once the page
    // whose URL starts with this has loaded, drop the WebView history beneath
    // it, so hardware back cannot re-enter discovery without its flags and
    // bounce straight back to the server just left. Read in the page-loaded
    // listener installed in onCreate; UI thread only.
    private String pendingHistoryClearPrefix;

    // Whether the page has connected this WebView to a server. Only then does
    // the failed-load duty apply, and only then is there a session to end.
    private boolean connectedToChosenServer;
    DiscoveryConstants discoveryConstants;
    private FileManager fileManager;
    private String js = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeApi.class);
        registerPlugin(HoneywellScannerPlugin.class);
        // Used by the new front end (open-msupply-frontend, src/platform/).
        // Registering here is only half the job: the UI is served by the
        // embedded server, so each plugin's name must ALSO be listed in
        // ExtendedWebViewClient.generatePluginScript() or the JS proxy has no
        // header to dispatch through.
        registerPlugin(FileTransferPlugin.class);
        registerPlugin(PrintPlugin.class);
        registerPlugin(ReadLogPlugin.class);
        // The discovery page's host (android-shared/, shared with the new
        // frontend's shell). Registering is only half the job here — the UI is
        // served by the embedded server, so the name must ALSO be in
        // ExtendedWebViewClient.generatePluginScript().
        registerPlugin(DiscoveryHostPlugin.class);
        super.onCreate(savedInstanceState);

        // Replace Capacitor's auto-loaded https://localhost:<PORT>/ with an inline
        // "Starting omSupply…" page. Without this, the WebView fires a GET against
        // a server that hasn't bound yet, which paints Chromium's native error page
        // and leaks through the brief window between splash dismissal and the real
        // /android URL finishing its load.
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new LoadingPage(this), "LoadingPageInject");
        webView.loadUrl(LoadingPage.URL);

        ViewCompat.setOnApplyWindowInsetsListener(webView, (v, insets) -> {
            Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                            | WindowInsetsCompat.Type.displayCutout()
                            | WindowInsetsCompat.Type.ime());

            float d = v.getResources().getDisplayMetrics().density;
            // set inset styles so that we can avoid edge-to-edge content being obscured by system bars, cutouts, or the keyboard
            js = "document.documentElement.style.setProperty('--inset-top',    '" + (bars.top / d)    + "px');" +
                    "document.documentElement.style.setProperty('--inset-bottom', '" + (bars.bottom / d) + "px');" +
                    "document.documentElement.style.setProperty('--inset-left',   '" + (bars.left / d)   + "px');" +
                    "document.documentElement.style.setProperty('--inset-right',  '" + (bars.right / d)  + "px');";

            // Apply immediately to the currently loaded document
            ((WebView) v).evaluateJavascript(js, null);

            return WindowInsetsCompat.CONSUMED;
        });

        // Re-inject the inset variables after every page navigation. A full page
        // load replaces the document, discarding any custom properties previously
        // set on documentElement, so the values must be re-applied to the new page.
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView view) {
                if (!js.isEmpty()) {
                    view.evaluateJavascript(js, null);
                }
                // Host duty (AC-DT16): clearHistory only drops entries that
                // have committed, so it has to run once the target page has
                // loaded. Prefix-matched because the final URL can carry a
                // query or a same-origin redirect.
                String prefix = MainActivity.this.pendingHistoryClearPrefix;
                if (prefix != null && view.getUrl() != null
                        && view.getUrl().startsWith(prefix)) {
                    view.clearHistory();
                    MainActivity.this.pendingHistoryClearPrefix = null;
                }
            }
        });


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

        // The server serves the web UI from <filesDir>/frontend; ship the
        // APK-bundled assets there before it starts
        FrontendAssets.sync(this);

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        server.start(discoveryConstants.PORT, path, cache, discoveryConstants.hardwareId);
    }

    @Override
    public void onDestroy() {
        // Host duty (frontend/src/discovery/hostContract.ts, AC-DT18): the
        // session ends with the app. Once the page has connected this WebView
        // to a chosen server the session belongs to that server and lives in
        // the cookie jar, which otherwise survives to the next launch — so
        // signing in would not be required after the auto-reconnect AC-DT1
        // performs. Only when a server was chosen: an install that never left
        // its own server keeps the device's own session, as it always has.
        //
        // Not guaranteed on a process kill; the server's token expiry is the
        // backstop, as it is on desktop.
        if (this.connectedToChosenServer) {
            CookieManager.getInstance().removeAllCookies(null);
            CookieManager.getInstance().flush();
        }
        super.onDestroy();
        server.stop();
    }

    @Override
    public void clearHistoryWhenLoaded(String urlPrefix) {
        this.pendingHistoryClearPrefix = urlPrefix;
    }

    @Override
    public void onServerChosen(String url, String hardwareId, int port, boolean isLocal) {
        // Certificate trust is the shell's job and cannot be done blind, so
        // the page says whose server this is (hostContract.ts §
        // ConnectedServer). NativeApi keeps it because that is where
        // CertWebViewClient already looks.
        this.connectedToChosenServer = true;
        NativeApi.chosenServer(url, hardwareId, port, isLocal);
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
