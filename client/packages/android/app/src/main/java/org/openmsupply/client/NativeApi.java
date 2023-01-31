package org.openmsupply.client;

import static android.content.Context.NSD_SERVICE;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.util.Random;

@CapacitorPlugin(name = "NativeApi")
public class NativeApi extends Plugin implements NsdManager.DiscoveryListener {

    DiscoveryConstants discoveryConstants;
    JSArray discoveredServers;
    JSObject connectedServer;
    NsdManager discoveryManager;
    boolean isDebug;
    boolean isAdvertising;
    String localUrl;
    boolean isDiscovering;
    boolean shouldRestartDiscovery;

    @Override
    public void load() {
        super.load();
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

    @Override
    protected void handleOnStart() {
        WebView webView = this.getBridge().getWebView();
        // advertiseService();
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(localUrl + "/android"));
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
        call.resolve(connectedServer);
    }

    @PluginMethod()
    public void connectToServer(PluginCall call) {
        JSObject server = call.getData();

        stopServerDiscovery();
        connectedServer = server;

        String url = isDebug ? localUrl
                : server.getString("protocol") + "://" + server.getString("ip") + ":" + server.getString("port");

        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(url));
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
                if (!serviceInfo.getServiceName().startsWith(discoveryConstants.SERVICE_NAME)) {
                    return;
                }

                JSObject server = serviceInfoToObject(serviceInfo);

                discoveredServers.put(server);
            }

            // NsdManager.ResolveListener
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
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
}