package org.openmsupply.client;

import static android.content.Context.NSD_SERVICE;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

import javax.net.ssl.SSLHandshakeException;

@CapacitorPlugin(name = "NativeApi")
public class NativeApi extends Plugin implements NsdManager.DiscoveryListener {
    public static final String OM_SUPPLY = "omSupply";
    private static final String DEFAULT_URL = "https://localhost:8000/";
    DiscoveryConstants discoveryConstants;
    JSArray discoveredServers;
    Deque<NsdServiceInfo> serversToResolve;
    omSupplyServer connectedServer;
    NsdManager discoveryManager;
    boolean isDebug;
    boolean isAdvertising;
    String localUrl;
    boolean isDiscovering;
    boolean isResolvingServer;
    boolean shouldRestartDiscovery;

    @Override
    public void load() {
        super.load();

        CertWebViewClient client = new CertWebViewClient(this.getBridge(), this.getContext().getFilesDir(), this);
        bridge.setWebViewClient(client);

        serversToResolve = new ArrayDeque<NsdServiceInfo>();
        isResolvingServer = false;
        discoveryConstants = new DiscoveryConstants(this.getActivity().getContentResolver());
        discoveryManager = (NsdManager) this.getActivity()
                .getSystemService(NSD_SERVICE);

        String debugUrl = getConfig().getString("debugUrl");
        isDebug = debugUrl != null && !debugUrl.equals("");
        localUrl = isDebug ? debugUrl : "https://localhost:" + discoveryConstants.PORT;
        isAdvertising = false;
        isDiscovering = false;
        shouldRestartDiscovery = false;
    }

    public boolean getIsDebug() {
        return isDebug;
    }

    public omSupplyServer getConnectedServer() {
        return connectedServer;
    }

    public String getLocalUrl() {
        return localUrl;
    }

    private void sleep(int delay) {
        try {
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void handleOnStart() {
        WebView webView = this.getBridge().getWebView();
        // this method (handleOnStart) is called when resuming and switching to the app
        // the webView url will be DEFAULT_URL only on the initial load
        // so this test is a quick check to see if we should be redirecting to the /android loader or not
        if (!webView.getUrl().matches(DEFAULT_URL)) return;
        // Initial load, display splash screen and wait for the server to start
        webView.post(() -> webView.loadData(SplashPage.encodedHtml, "text/html", "base64"));
        // advertiseService();
        Thread thread = new Thread(new Runnable() {
            @Override
            public void run() {
                Boolean isServerRunning = false;
                Integer retryCount = 5;
                while (!isServerRunning && retryCount > 0) {
                    try {
                        URL url = new URL(localUrl);
                        HttpURLConnection urlc = (HttpURLConnection) url.openConnection();
                        // actually no point - the timeout only applies when trying to find a server
                        // when using localhost it returns immediately even if the server isn't
                        // responding
                        urlc.setConnectTimeout(1000);
                        urlc.connect();
                        if (urlc.getResponseCode() == 200) {
                            isServerRunning = true;
                        }
                    } catch (SSLHandshakeException e) {
                        // server is running and responding with an SSL error
                        // which we will ignore, so ok to proceed
                        isServerRunning = true;
                    } catch (Exception e) {
                        Log.e(OM_SUPPLY, e.getMessage());
                        isServerRunning = false;
                    }
                    retryCount--;
                    sleep(1000);
                }

                // .post to run on UI thread in the two calls below
                if (isServerRunning) {
                    webView.post(() -> webView.loadUrl(localUrl + "/android"));
                } else {
                    webView.post(() -> webView.loadData(ErrorPage.encodedHtml, "text/html", "base64"));
                }
            }
        });
        thread.start();
    }

    @Override
    protected void handleOnStop() {
        stopServerDiscovery();
    }

    @PluginMethod()
    public void goBackToDiscovery(PluginCall call) {
        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(localUrl + "/discovery?autoconnect=false"));
    }

    // Advertise local remote server on network
    @PluginMethod()
    public void advertiseService(PluginCall call) {
        if (isAdvertising) {
            return;
        }
        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setServiceName(discoveryConstants.SERVICE_NAME);
        serviceInfo.setServiceType(discoveryConstants.SERVICE_TYPE);
        serviceInfo.setPort(discoveryConstants.PORT);
        serviceInfo.setAttribute(discoveryConstants.PROTOCOL_KEY, "https");
        serviceInfo.setAttribute(discoveryConstants.CLIENT_VERSION_KEY, "unspecified");
        serviceInfo.setAttribute(discoveryConstants.HARDWARE_ID_KEY, discoveryConstants.hardwareId);

        discoveryManager = (NsdManager) this.getActivity()
                .getSystemService(NSD_SERVICE);

        discoveryManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD,
                new NsdManager.RegistrationListener() {
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
        isAdvertising = true;
    }

    private void stopServerDiscovery() {
        if (!isDiscovering) {
            return;
        }

        try {
            discoveryManager.stopServiceDiscovery(this);
        } catch (Exception e) {
            Logger.error("Service discovery cannot be stopped " + e);
        }
    }

    @PluginMethod()
    public void startServerDiscovery(PluginCall call) {
        if (isDiscovering) {
            shouldRestartDiscovery = true;
            stopServerDiscovery();
            return;
        }

        shouldRestartDiscovery = false;
        discoveredServers = new JSArray();

        // Some navigation events may cause server discovery to still be ongoing
        try {
            // `this` would be NsdManager.DiscoveryListener, and main method is
            // onServiceFound
            discoveryManager.discoverServices(discoveryConstants.SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, this);
        } catch (Exception e) {
            Logger.error("Cannot start server discovery " + e);
        }
    }

    // Return discoveredServers and reset discoveredServers array
    // (to avoid large array being sent to client,
    // since duplicates in discoveredServers are frequent)
    @PluginMethod()
    public void discoveredServers(PluginCall call) {
        JSObject result = new JSObject();
        result.put("servers", discoveredServers);
        discoveredServers = new JSArray();

        call.resolve(result);
    }

    @PluginMethod()
    public void connectedServer(PluginCall call) {
        call.resolve(connectedServer == null ? null : connectedServer.data);
    }

    @PluginMethod()
    public void connectToServer(PluginCall call) {
        omSupplyServer server = new omSupplyServer(call.getData());

        stopServerDiscovery();
        connectedServer = server;

        String url = isDebug ? localUrl
                : server.getUrl();

        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(url));
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onServiceFound(NsdServiceInfo serviceInfo) {
        if (!serviceInfo.getServiceName().startsWith(discoveryConstants.SERVICE_NAME)) {
            return;
        }

        serversToResolve.push(serviceInfo);
        tryResolveServer();
    }

    private void tryResolveServer() {
        if (isResolvingServer) {
            return;
        }

        isResolvingServer = true;

        if (serversToResolve.peek() == null) {
            isResolvingServer = false;
            return;
        }

        NsdServiceInfo serviceInfo = serversToResolve.pop();

        discoveryManager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                if (!serviceInfo.getServiceName().startsWith(discoveryConstants.SERVICE_NAME)) {
                    return;
                }

                JSObject server = serviceInfoToObject(serviceInfo);

                discoveredServers.put(server);
                isResolvingServer = false;
                tryResolveServer();
            }

            // NsdManager.ResolveListener
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                isResolvingServer = false;
                tryResolveServer();
            }
        });
    }

    private JSObject serviceInfoToObject(NsdServiceInfo serviceInfo) {
        String serverHardwareId = parseAttribute(serviceInfo, discoveryConstants.HARDWARE_ID_KEY);
        return new JSObject()
                .put("protocol", parseAttribute(serviceInfo, discoveryConstants.PROTOCOL_KEY))
                .put("clientVersion", parseAttribute(serviceInfo, discoveryConstants.CLIENT_VERSION_KEY))
                .put("port", serviceInfo.getPort())
                .put("ip", serviceInfo.getHost().getHostAddress())
                .put("hardwareId", serverHardwareId)
                .put("isLocal", serverHardwareId.equals(discoveryConstants.hardwareId));

    }

    private String parseAttribute(NsdServiceInfo serviceInfo, String name) {
        byte[] attributeBytes = serviceInfo.getAttributes().get(name);
        if (attributeBytes == null) {
            throw new RuntimeException();
        }
        return new String(attributeBytes, StandardCharsets.UTF_8);
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
        isDiscovering = true;
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onDiscoveryStopped(String serviceType) {
        isDiscovering = false;
        if (shouldRestartDiscovery) {
            startServerDiscovery(null);
        }
    }

    public class omSupplyServer {
        JSObject data;

        public omSupplyServer(JSObject data) {
            this.data = data;
        }

        public String getUrl() {
            return data.getString("protocol") + "://" + data.getString("ip") + ":" + data.getString("port");
        }

        public boolean isLocal() {
            return data.getBool("isLocal");
        }

        public String getHardwareId() {
            return data.getString("hardwareId");
        }

        public int getPort() {
            return data.getInteger("port");
        }
    }
}