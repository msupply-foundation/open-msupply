package org.openmsupply.mobile;

import static android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW;

import android.content.Context;
import android.net.http.SslError;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.openmsupply.mobile.RemoteServer;

import java.nio.charset.StandardCharsets;
import java.util.Random;

public class MainActivity extends AppCompatActivity implements NsdManager.DiscoveryListener {
    static final String TAG_WV = "WEB-VIEW";
    static final String SERVICE_TYPE = "_omsupply._tcp";
    static final String SERVICE_NAME = "omSupplyServer";
    static final String PROTOCOL_KEY = "protocol";
    static final String CLIENT_VERSION_KEY = "client_version";
    static final String HARDWARE_ID_KEY = "hardware_id";
    static final Integer PORT = 8000;

    RemoteServer server = new RemoteServer();
    NsdManager discoveryManager;
    WebView wv;
    WebView printView;
    JSONArray discoveredServers;
    JSONObject connectedServer;
    String hardwareId;
    PrintManager printManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        hardwareId = Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ANDROID_ID);

        server.start(PORT, path, cache, hardwareId);

        printManager = (PrintManager) this
                .getSystemService(Context.PRINT_SERVICE);

        advertiseService();

        wv = createWebView();
        wv.zoomOut();
        // TODO this will need to change if we are adding controls
        setContentView(wv);
        // TODO need to wait (on slower devices maybe problematic)
        // Autoconnect set to true (previously connected server would be auto connected when discovered)
        // matching for this is done in useNativeClient hook (matching by hardwardId and port)
        wv.loadUrl("https://localhost:8000/discovery" + "?autoconnect=true");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }


    void advertiseService() {
        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setServiceName(SERVICE_NAME);
        serviceInfo.setServiceType(SERVICE_TYPE);
        serviceInfo.setPort(PORT);
        serviceInfo.setAttribute(PROTOCOL_KEY, "https");
        serviceInfo.setAttribute(CLIENT_VERSION_KEY, "unspecified");
        serviceInfo.setAttribute(HARDWARE_ID_KEY, hardwareId);
        discoveredServers = new JSONArray();
        discoveryManager = (NsdManager) this
                .getSystemService(NSD_SERVICE);

        discoveryManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, new NsdManager.RegistrationListener() {
            @Override
            public void onServiceRegistered(NsdServiceInfo NsdServiceInfo) {
            }

            @Override
            public void onRegistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
            }

            @Override
            public void onServiceUnregistered(NsdServiceInfo arg0) {
            }

            @Override
            public void onUnregistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
            }
        });
    }

    WebView createWebView() {
        WebView wv = new WebView(this);

        // SETUP
        WebSettings webSettings = wv.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        // TODO make sure this is only allowed in discovery
        webSettings.setMixedContentMode(MIXED_CONTENT_ALWAYS_ALLOW);

        // SSL
        wv.setWebViewClient(new WebViewClient() {
            // TODO store an object with this shape: { [hardware_id + port]: cert }, retreive this object on startup
            // update/save this object when connecting to 'new' server that is not in the object
            // if server is in the object make sure cert matches

            @Override
            public void onReceivedSslError(WebView view,
                                           SslErrorHandler handler,
                                           SslError error) {
                handler.proceed();
            }
        });

        // LOGGING
        wv.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG_WV, consoleMessage.message() + " -- From line " +
                        consoleMessage.lineNumber() + " of " + consoleMessage.sourceId());
                return true;
            }
        });

        // Bind methods with @JavescriptInterface annotation
        wv.addJavascriptInterface(this, "androidNativeAPI");

        return wv;
    }

    // Available in JS as androidNativeAPI.startServerDiscovery
    @JavascriptInterface
    public void startServerDiscovery() {
        discoveredServers = new JSONArray();
        // `this` would be NsdManager.DiscoveryListener, and main method is onServiceFound
        discoveryManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, this);
    }

    // Available in JS as androidNativeAPI.startServerDiscovery
    @JavascriptInterface
    public void goBackToDiscovery() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                // Autoconnect set to false (to allow browsing discovered servers)
                wv.loadUrl("https://localhost:8000/discovery?autoconnect=false");
            }
        });
    }

    // Available in JS as androidNativeAPI.discoveredServers
    // Return discoveredServers and reset discoveredServers array (to avoid large array being sent
    // to client, since duplicates in discoveredServers are frequent)
    @JavascriptInterface
    public String discoveredServers() {
        JSONArray servers = discoveredServers;
        discoveredServers = new JSONArray();
        return servers.toString();

    }

    @JavascriptInterface
    public boolean print(String html) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                startPrint(html);
            }
        });
        return true;
    }

    // Available in JS as androidNativeAPI.connectedServer
    @JavascriptInterface
    public String connectedServer() {
        if (connectedServer == null) return "";
        return connectedServer.toString();
    }

    // Available in JS as androidNativeAPI.connectToServer
    @JavascriptInterface
    public void connectToServer(String serverJson) throws JSONException {
        JSONObject server = new JSONObject(serverJson);

        discoveryManager.stopServiceDiscovery(this);
        connectedServer = server;

        String url = server.getString("protocol") + "://" + server.getString("ip") + ":" + server.getString("port");

        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                wv.loadUrl(url);
            }
        });
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onServiceFound(NsdServiceInfo serviceInfo) {
        try {
            // Otherwise conflicting resolve causing onResolveFailed
            Thread.sleep(new Random().nextInt(50) + 50);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        discoveryManager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                if (!serviceInfo.getServiceName().startsWith(SERVICE_NAME)) {
                    return;
                }

                JSONObject server = serviceInfoToObject(serviceInfo);
                if (server == null) return;
                discoveredServers.put(server);
            }

            // NsdManager.ResolveListener
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
            }
        });
    }


    private String parseAttribute(NsdServiceInfo serviceInfo, String name) {
        byte[] attributeBytes = serviceInfo.getAttributes().get(name);
        if (attributeBytes == null) {
            throw new RuntimeException();
        }
        return new String(attributeBytes, StandardCharsets.UTF_8);
    }

    private JSONObject serviceInfoToObject(NsdServiceInfo serviceInfo) {
        try {
            String serverHardwareId = parseAttribute(serviceInfo, HARDWARE_ID_KEY);
            return new JSONObject()
                    .put("protocol", parseAttribute(serviceInfo, PROTOCOL_KEY))
                    .put("clientVersion", parseAttribute(serviceInfo, CLIENT_VERSION_KEY))
                    .put("port", serviceInfo.getPort())
                    .put("ip", serviceInfo.getHost().getHostAddress())
                    .put("hardwareId", serverHardwareId)
                    .put("isLocal", serverHardwareId.equals(hardwareId));

        } catch (JSONException e) {
            e.printStackTrace();
            return null;
        }
    }

    // Simple print window
    private void startPrint(String html) {
        printView = new WebView(this);
        printView.setWebViewClient(new WebViewClient() {
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return false;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                String jobName = getString(R.string.app_name) + " Document";
                PrintDocumentAdapter printAdapter = printView.createPrintDocumentAdapter(jobName);
                printManager.print(jobName, printAdapter,
                        new PrintAttributes.Builder().build());
                printView = null;
            }
        });

        printView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null);
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onServiceLost(NsdServiceInfo service) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onStartDiscoveryFailed(String serviceType, int errorCode) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onStopDiscoveryFailed(String serviceType, int errorCode) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onDiscoveryStarted(String serviceType) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onDiscoveryStopped(String serviceType) {
    }

}

