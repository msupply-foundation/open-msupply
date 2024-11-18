package org.openmsupply.client;

import android.graphics.Bitmap;
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
            this.jsInject = this.generatePluginScript();
        }
    }

    // Have to manually inject Capacitor JS, this typically happens in
    // WebViewLocalServer.handleProxyRequest
    // but since it manually uses net.URL to fetch the content of request, this
    // fails for self signed certificates and plugin definitions etc is not injected
    @Override
    public void onPageStarted(WebView webView, String url, Bitmap favicon) {
        Logger.debug("onPageStarted" + url   );
        if (url.startsWith("data:text")) return;

        // Just incase the js hasn't been generated yet, generate it here.
        this.loadJsInject()

        if(this.jsInject != null) {
            Logger.debug("injecting JS");
            // .post to run on UI thread
            webView.post(() -> webView.evaluateJavascript(this.jsInject, null));
        }
    }

    String generatePluginScript() {
        // TODO make sure this is only injected for pages in native bundle
        // There is no way to get the full list of plugins from bridge, use 'debug' and
        // see what plugins to add

        // This function needs to run after plugins are registered, so can't be part of the constructor as order doesn't appear to be consistent.
        List<String> pluginNames =  Arrays.asList("NativeApi","Keyboard", "WebView","BarcodeScanner","Preferences", "KeepAwake", "App", "Printer");
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
