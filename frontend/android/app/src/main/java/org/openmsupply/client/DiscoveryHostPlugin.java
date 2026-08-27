package org.openmsupply.client;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.content.Context;
import android.provider.Settings;

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
 * The Android host of the discovery contract the page drives
 * (src/discovery/hostContract.ts; reached through the adapter in
 * src/platform/discoveryHost.ts). Primitive facts and native capabilities
 * only — NsdManager browsing handed over verbatim, this device's facts
 * (hostInfo), the bounded answer check (probe), and WebView navigation
 * (navigate). Locality marking, address rewriting, remembering, and the
 * probe/record/navigate ordering are all the PAGE's (discovery.ts): nothing
 * here decides anything, so this host cannot drift from the Electron one on
 * behaviour.
 *
 * hostInfo's hardwareId is this device's ANDROID_ID — the same value
 * MainActivity hands the embedded server to announce, so the page's
 * hardware-id locality compare (spec/android § server discovery) matches.
 * ANDROID_ID is scoped PER SIGNING KEY since Android 8, so it only matches
 * an announcement from a server another app started if both apps share a
 * key. They do, by existing plan: this app ships with the legacy app's
 * release key (kdd/android § signing) — verified live against the legacy
 * tablet-as-server (debug keys, emulator).
 *
 * SPIKE-level trust, same as MainActivity's SSL bypass: probe accepts any
 * certificate. The real app ports the legacy CertWebViewClient (validate
 * local cert + TOFU for remote servers) — spec/android § connection trust.
 */
@CapacitorPlugin(name = "DiscoveryHost")
public class DiscoveryHostPlugin extends Plugin {
    private static final String SERVICE_TYPE = "_omsupply._tcp.";

    private NsdManager nsdManager;
    private NsdManager.DiscoveryListener discoveryListener;
    private final List<JSObject> announcements = Collections.synchronizedList(new ArrayList<>());
    // NsdManager resolves ONE service at a time; found services queue here.
    private final Deque<NsdServiceInfo> resolveQueue = new ArrayDeque<>();
    private volatile boolean resolving = false;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void hostInfo(PluginCall call) {
        JSArray lanAddresses = new JSArray();
        for (String address : this.siteLocalAddresses()) lanAddresses.put(address);
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("hardwareId", this.deviceHardwareId());
        result.put("lanAddresses", lanAddresses);
        call.resolve(result);
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (this.nsdManager == null) {
            this.nsdManager = (NsdManager) super.getContext().getSystemService(Context.NSD_SERVICE);
        }
        this.stopDiscovery();
        this.announcements.clear();
        synchronized (this.resolveQueue) {
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
                synchronized (DiscoveryHostPlugin.this.resolveQueue) {
                    DiscoveryHostPlugin.this.resolveQueue.add(serviceInfo);
                }
                DiscoveryHostPlugin.this.resolveNext();
            }
        };
        this.nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, this.discoveryListener);
        call.resolve();
    }

    private void stopDiscovery() {
        if (this.nsdManager != null && this.discoveryListener != null) {
            try {
                this.nsdManager.stopServiceDiscovery(this.discoveryListener);
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
                JSObject announcement = DiscoveryHostPlugin.this.toAnnouncement(serviceInfo);
                if (announcement != null) DiscoveryHostPlugin.this.announcements.add(announcement);
                this.finished();
            }

            private void finished() {
                synchronized (DiscoveryHostPlugin.this.resolveQueue) {
                    DiscoveryHostPlugin.this.resolving = false;
                }
                DiscoveryHostPlugin.this.resolveNext();
            }
        });
    }

    /** One resolved service → the verbatim announcement shape
     * (hostContract.ts § RawAnnouncement): the resolved address and the TXT
     * identity attributes, unmarked and unrewritten — locality and address
     * policy are the page's. IPv4-only because the wire shape carries one
     * dotted-quad `ip`; the page re-checks completeness (AC-DT7), so partial
     * TXT records pass through as ''. */
    private JSObject toAnnouncement(NsdServiceInfo info) {
        InetAddress address = info.getHost();
        if (!(address instanceof Inet4Address)) return null;
        Map<String, byte[]> txt = info.getAttributes();
        JSObject announcement = new JSObject();
        announcement.put("ip", address.getHostAddress());
        announcement.put("port", info.getPort());
        announcement.put("protocol", this.txtValue(txt, "protocol"));
        announcement.put("clientVersion", this.txtValue(txt, "client_version"));
        announcement.put("hardwareId", this.txtValue(txt, "hardware_id"));
        return announcement;
    }

    private String deviceHardwareId() {
        String id = Settings.Secure.getString(
            super.getContext().getContentResolver(),
            Settings.Secure.ANDROID_ID
        );
        return id == null ? "" : id;
    }

    private String txtValue(Map<String, byte[]> txt, String key) {
        byte[] value = txt == null ? null : txt.get(key);
        return value == null ? "" : new String(value, StandardCharsets.UTF_8);
    }

    /** This device's reachable-by-others IPv4s (hostInfo.lanAddresses) —
     * site-local, never loopback or link-local. May be empty (no network);
     * the page then keeps whatever address was resolved. */
    private List<String> siteLocalAddresses() {
        List<String> result = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                Enumeration<InetAddress> addresses = interfaces.nextElement().getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress address = addresses.nextElement();
                    if (address instanceof Inet4Address
                            && !address.isLoopbackAddress()
                            && !address.isLinkLocalAddress()
                            && address.isSiteLocalAddress()) {
                        result.add(address.getHostAddress());
                    }
                }
            }
        } catch (Exception ignored) {}
        return result;
    }

    @PluginMethod
    public void announcements(PluginCall call) {
        JSArray found = new JSArray();
        synchronized (this.announcements) {
            for (JSObject announcement : this.announcements) found.put(announcement);
        }
        JSObject result = new JSObject();
        result.put("announcements", found);
        call.resolve(result);
    }

    @PluginMethod
    public void probe(PluginCall call) {
        String url = call.getString("url", "");
        // The timeout is the page's constant (discovery.ts §
        // ANSWER_CHECK_TIMEOUT_MS), clamped here only against a nonsense
        // value crossing the bridge.
        int timeoutMs = Math.min(Math.max(call.getInt("timeoutMs", 5000), 500), 30000);
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            JSObject result = new JSObject();
            result.put("answered", false);
            call.resolve(result);
            return;
        }
        this.executor.execute(() -> {
            JSObject result = new JSObject();
            result.put("answered", this.answers(url, timeoutMs));
            call.resolve(result);
        });
    }

    private boolean answers(String target, int timeoutMs) {
        try {
            HttpURLConnection connection = (HttpURLConnection) new URL(target).openConnection();
            if (connection instanceof HttpsURLConnection) {
                this.trustAnyCertificate((HttpsURLConnection) connection);
            }
            connection.setConnectTimeout(timeoutMs);
            connection.setReadTimeout(timeoutMs);
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
    public void navigate(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            call.reject("navigate: not an http(s) URL");
            return;
        }
        // Resolve immediately: the page has already persisted what it needs
        // (record-before-navigate, discovery.ts § connectToServer), so there
        // is no grace delay to time.
        String origin = this.originOf(url);
        super.getActivity().runOnUiThread(() -> {
            // Host duty (AC-DT16): a host-initiated navigation is a fresh
            // start — once the target commits, drop the WebView history
            // beneath it, or hardware back re-enters discovery flagless and
            // its autoconnect bounces straight back
            // (MainActivity.clearHistoryWhenLoaded).
            ((MainActivity) super.getActivity()).clearHistoryWhenLoaded(origin);
            super.bridge.getWebView().loadUrl(url);
        });
        call.resolve();
    }

    /** scheme://host[:port] of a URL — the prefix the history clear matches
     * on (the final URL can carry a path, query, or same-origin redirect). */
    private String originOf(String url) {
        try {
            URL parsed = new URL(url);
            return parsed.getPort() == -1
                ? parsed.getProtocol() + "://" + parsed.getHost()
                : parsed.getProtocol() + "://" + parsed.getHost() + ":" + parsed.getPort();
        } catch (Exception e) {
            return url;
        }
    }
}
