package org.openmsupply.client;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.content.Context;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * The Android half of the desktop-host bridge the discovery page drives
 * (src/desktop/hostBridge.ts; reached through the adapter in
 * src/platform/discoveryHost.ts). Same plugin name as the current app's
 * Android bridge ("NativeApi") so the two stay one recognisable contract.
 *
 * Host duties per src/desktop/README.md's table: browse mDNS announcements
 * (NsdManager, `_omsupply._tcp`), mark a server on this machine, run the
 * bounded answer check before navigating, and navigate the WebView to the
 * chosen server's own origin — HONOURING the `path`, which carries the
 * login hand-off's discovery-return + lng parameters (AC-DT23/24).
 *
 * SPIKE-level trust, same as MainActivity's SSL bypass: the answer check
 * accepts any certificate. The real app ports the legacy CertWebViewClient
 * (validate local cert + TOFU for remote servers) — spec/android
 * § connection trust.
 */
@CapacitorPlugin(name = "NativeApi")
public class NativeApiPlugin extends Plugin {
    private static final String SERVICE_TYPE = "_omsupply._tcp.";
    private static final int ANSWER_CHECK_TIMEOUT_MS = 5000;

    private NsdManager nsdManager;
    private NsdManager.DiscoveryListener discoveryListener;
    private final List<JSObject> discovered = Collections.synchronizedList(new ArrayList<>());
    // NsdManager resolves ONE service at a time; found services queue here.
    private final Deque<NsdServiceInfo> resolveQueue = new ArrayDeque<>();
    private volatile boolean resolving = false;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void startServerDiscovery(PluginCall call) {
        if (nsdManager == null) {
            this.nsdManager = (NsdManager) super.getContext().getSystemService(Context.NSD_SERVICE);
        }
        this.stopDiscovery();
        this.discovered.clear();
        synchronized (resolveQueue) {
            this.resolveQueue.clear();
            this.resolving = false;
        }

        this.discoveryListener = new NsdManager.DiscoveryListener() {
            @Override public void onDiscoveryStarted(String serviceType) {}
            @Override public void onDiscoveryStopped(String serviceType) {}
            @Override public void onStartDiscoveryFailed(String serviceType, int errorCode) {}
            @Override public void onStopDiscoveryFailed(String serviceType, int errorCode) {}
            @Override public void onServiceLost(NsdServiceInfo serviceInfo) {
                // The page owns list lifecycle: a vanished server persists
                // until the user searches again (spec § server discovery).
            }
            @Override
            public void onServiceFound(NsdServiceInfo serviceInfo) {
                synchronized (resolveQueue) {
                    resolveQueue.add(serviceInfo);
                }
                resolveNext();
            }
        };
        this.nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener);
        call.resolve();
    }

    private void stopDiscovery() {
        if (this.nsdManager != null && this.discoveryListener != null) {
            try {
                this.nsdManager.stopServiceDiscovery(discoveryListener);
            } catch (IllegalArgumentException ignored) {
                // was not discovering
            }
            this.discoveryListener = null;
        }
    }

    private void resolveNext() {
        NsdServiceInfo next;
        synchronized (this.resolveQueue) {
            if (this.resolving) return;
            next = this.resolveQueue.poll();
            if (next == null) return;
            this.resolving = true;
        }
        this.nsdManager.resolveService(next, new NsdManager.ResolveListener() {
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                this.finished();
            }

            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                JSObject host = NativeApiPlugin.this.toFrontEndHost(serviceInfo);
                if (host != null) NativeApiPlugin.this.discovered.add(host);
                this.finished();
            }

            private void finished() {
                synchronized (NativeApiPlugin.this.resolveQueue) {
                    NativeApiPlugin.this.resolving = false;
                }
                NativeApiPlugin.this.resolveNext();
            }
        });
    }

    /** One resolved announcement → the page's FrontEndHost shape. The page
     * re-checks completeness (AC-DT7), so partial records pass through. */
    private JSObject toFrontEndHost(NsdServiceInfo info) {
        InetAddress address = info.getHost();
        if (!(address instanceof Inet4Address)) return null;
        String ip = address.getHostAddress();
        Map<String, byte[]> txt = info.getAttributes();
        JSObject host = new JSObject();
        host.put("protocol", "http".equals(this.txtValue(txt, "protocol")) ? "http" : "https");
        host.put("port", info.getPort());
        host.put("ip", ip);
        host.put("clientVersion", this.txtValue(txt, "client_version"));
        host.put("hardwareId", this.txtValue(txt, "hardware_id"));
        host.put("isLocal", this.isOwnAddress(address));
        return host;
    }

    private String txtValue(Map<String, byte[]> txt, String key) {
        byte[] value = txt == null ? null : txt.get(key);
        return value == null ? "" : new String(value, StandardCharsets.UTF_8);
    }

    private boolean isOwnAddress(InetAddress address) {
        if (address.isLoopbackAddress()) return true;
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                Enumeration<InetAddress> addresses = interfaces.nextElement().getInetAddresses();
                while (addresses.hasMoreElements()) {
                    if (addresses.nextElement().equals(address)) return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    @PluginMethod
    public void discoveredServers(PluginCall call) {
        JSArray servers = new JSArray();
        synchronized (this.discovered) {
            for (JSObject host : this.discovered) servers.put(host);
        }
        JSObject result = new JSObject();
        result.put("servers", servers);
        call.resolve(result);
    }

    @PluginMethod
    public void connectToServer(PluginCall call) {
        String protocol = call.getString("protocol", "https");
        String ip = call.getString("ip", "");
        Integer port = call.getInt("port", 0);
        String path = call.getString("path", "");
        String base = protocol + "://" + ip + ":" + port;

        this.executor.execute(() -> {
            // The bounded answer check (spec § launch / § server selection):
            // a server that does not answer leaves the user on the page.
            if (!this.answers(base + "/graphql")) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "server did not answer");
                call.resolve(result);
                return;
            }
            // Resolve first — the page records the choice — then navigate,
            // WITH the path (the discovery-return + lng hand-off).
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            String target = base + "/" + path;
            getActivity().runOnUiThread(() -> {
                // Fresh start: without the history clear, hardware back from
                // the server would re-enter discovery flagless and its
                // autoconnect would bounce straight back (MainActivity
                // clearHistoryWhenLoaded).
                ((MainActivity) getActivity()).clearHistoryWhenLoaded(base);
                bridge.getWebView().loadUrl(target);
            });
        });
    }

    private boolean answers(String target) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(target).openConnection();
            if (connection instanceof HttpsURLConnection) {
                this.trustAnyCertificate((HttpsURLConnection) connection);
            }
            connection.setConnectTimeout(ANSWER_CHECK_TIMEOUT_MS);
            connection.setReadTimeout(ANSWER_CHECK_TIMEOUT_MS);
            connection.getResponseCode(); // any HTTP answer counts
            connection.disconnect();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** SPIKE: accept any certificate — parity with MainActivity's WebView SSL
     * bypass; the real trust model is spec/android § connection trust. */
    private void trustAnyCertificate(HttpsURLConnection connection) throws Exception {
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, new TrustManager[] {
            new X509TrustManager() {
                @Override public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                @Override public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            }
        }, new java.security.SecureRandom());
        connection.setSSLSocketFactory(context.getSocketFactory());
        connection.setHostnameVerifier((hostname, session) -> true);
    }

    @PluginMethod
    public void connectedServer(PluginCall call) {
        // Display-only in the contract; nothing tracked on Android yet.
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void goBackToDiscovery(PluginCall call) {
        String target = bridge.getLocalUrl() + "/discovery/index.html?autoconnect=false";
        getActivity().runOnUiThread(() -> {
            // Fresh start, like connectToServer: back from discovery leaves
            // the app rather than returning to the server just left.
            ((MainActivity) getActivity()).clearHistoryWhenLoaded(bridge.getLocalUrl() + "/discovery/");
            bridge.getWebView().loadUrl(target);
        });
        call.resolve();
    }
}
