package org.openmsupply.client;

import android.graphics.Bitmap;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSExport;
import com.getcapacitor.Logger;
import com.getcapacitor.PluginHandle;

import java.util.Arrays;
import java.util.List;
import java.util.ArrayList;



public class ExtendedWebViewClient extends BridgeWebViewClient {
    Bridge bridge;
    String jsInject;

    public ExtendedWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    public void loadJsInject() {
        if(this.jsInject == null) {
            Logger.debug("Generating JS");
            this.jsInject = this.generatePluginScript();
        }
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        Log.e(NativeApi.OM_SUPPLY, "WebView onReceivedError"
                + " url=" + request.getUrl()
                + " mainFrame=" + request.isForMainFrame()
                + " method=" + request.getMethod()
                + " errorCode=" + error.getErrorCode()
                + " description=" + error.getDescription()
                + " atMs=" + System.currentTimeMillis());
        super.onReceivedError(view, request, error);
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        Log.e(NativeApi.OM_SUPPLY, "WebView onReceivedHttpError"
                + " url=" + request.getUrl()
                + " mainFrame=" + request.isForMainFrame()
                + " status=" + errorResponse.getStatusCode()
                + " reason=" + errorResponse.getReasonPhrase()
                + " atMs=" + System.currentTimeMillis());
        super.onReceivedHttpError(view, request, errorResponse);
    }

    // Have to manually inject Capacitor JS, this typically happens in
    // WebViewLocalServer.handleProxyRequest
    // but since it manually uses net.URL to fetch the content of request, this
    // fails for self signed certificates and plugin definitions etc is not injected
    @Override
    public void onPageStarted(WebView webView, String url, Bitmap favicon) {
        if (url.startsWith("data:text")) return;
        // Skip Capacitor JS injection for our bundled native pages
        // (LoadingPage / ErrorPage). They only need their own JS bridge
        // and don't talk to the rest of the Capacitor plugin system.
        if (url.startsWith("file:///android_asset/native/")) return;

        // Just incase the js hasn't been generated yet, generate it here.
        this.loadJsInject();

        if(this.jsInject != null) {
            Logger.debug("injecting JS");
            // .post to run on UI thread
            webView.post(() -> webView.evaluateJavascript(this.jsInject, null));
        } else {
            Logger.error("JS not generated, not injecting");
            webView.post(() -> webView.evaluateJavascript("alert('Error unable to load javascript to inject. Please contact mSupply Support for assistance.')", null));
        }
    }

    String generatePluginScript() {
        // TODO make sure this is only injected for pages in native bundle
        // There is no way to get the full list of plugins from bridge, use 'debug' and
        // see what plugins to add

        // This function needs to run after plugins are registered, so can't be part of the constructor as order doesn't appear to be consistent.
        // A name in this list with no registered plugin aborts the whole
        // injection (return null below), leaving the served UI with no bridge
        // at all - so keep it in step with the registrations in MainActivity
        // and with the npm plugins in assets/capacitor.plugins.json.
        // Share, and our own FileTransfer / Print / ReadLog, are used only by
        // the new front end.
        List<String> pluginNames =  Arrays.asList("NativeApi","Keyboard", "WebView","BarcodeScanner","HoneywellScanner","Preferences", "KeepAwake", "App", "Printer", "Camera", "Geolocation", "Filesystem", "FileOpener", "Device", "ScreenOrientation", "Share", "FileTransfer", "Print", "ReadLog");
        List<PluginHandle> pluginList = new ArrayList<>();
        for (String pluginName : pluginNames) {
            PluginHandle plugin = bridge.getPlugin(pluginName);
            if (plugin == null) {
                Logger.error("Couldn't find plugin : " + pluginName);
                return null;
            }
            pluginList.add(plugin);
        }

        try {
            // From Bridge.getJSInjector()
            String globalJS = JSExport.getGlobalJS(bridge.getContext(), bridge.getConfig().isLoggingEnabled(),
                    bridge.isDevMode());
            String bridgeJS = JSExport.getBridgeJS(bridge.getContext());
            String pluginJS = JSExport.getPluginJS(pluginList);
            String cordovaJS = JSExport.getCordovaJS(bridge.getContext());
            String cordovaPluginsJS = JSExport.getCordovaPluginJS(bridge.getContext());
            String cordovaPluginsFileJS = JSExport.getCordovaPluginsFileJS(bridge.getContext());
            // This would mean getServerUrl wouldn't work correctly (we are not using it)
            String localUrlJS = "window.WEBVIEW_SERVER_URL = '';";

            // From JSInjector.getScriptString()
            return globalJS +
                    " \n\n" +
                    localUrlJS +
                    "\n\n" +
                    bridgeJS +
                    "\n\n" +
                    pluginJS +
                    "\n\n" +
                    cordovaJS +
                    "\n\n" +
                    cordovaPluginsFileJS +
                    "\n\n" +
                    cordovaPluginsJS +
                    "\n\n";
        } catch (Exception ex) {
            Logger.error("Unable to export Capacitor JS. App will not function!", ex);
        }
        return null;
    }
}
