package org.openmsupply.client;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
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
 * Shared by BOTH Android projects (src/shared/README.md): one
 * implementation per platform is the whole point of the contract, so this
 * file must never name a project-specific class — what it needs from its
 * host activity it asks through DiscoveryHostActivity.
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
    // @capacitor/preferences stores under its configured group, whose
    // default this is (PreferencesConfiguration.DEFAULTS.group).
    private static final String LEGACY_PREFERENCES_GROUP = "CapacitorStorage";

    // probe()'s timeout bounds. The budget itself is the PAGE's constant
    // (discovery.ts § ANSWER_CHECK_TIMEOUT_MS) so it exists once and both
    // hosts get the same one; these only fence a nonsense value crossing the
    // bridge, and the default only covers a call that omitted it entirely.
    private static final int PROBE_TIMEOUT_DEFAULT_MS = 5000;
    private static final int PROBE_TIMEOUT_MIN_MS = 500;
    private static final int PROBE_TIMEOUT_MAX_MS = 30000;

    private NsdManager nsdManager;
    private NsdManager.DiscoveryListener discoveryListener;
    private final List<JSObject> announcements = Collections.synchronizedList(new ArrayList<>());
    // NsdManager resolves ONE service at a time; found services queue here.
    private final Deque<NsdServiceInfo> resolveQueue = new ArrayDeque<>();
    private volatile boolean resolving = false;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    // Host of the server the page last connected to (navigate). The one host
    // this WebView may follow links and redirects on — see
    // shouldOverrideLoad. Written from the bridge thread, read on the UI
    // thread.
    private volatile String connectedHost;

    @PluginMethod
    public void hostInfo(PluginCall call) {
        JSArray lanAddresses = new JSArray();
        for (String address : this.siteLocalAddresses()) lanAddresses.put(address);
        JSObject result = new JSObject();
        result.put("platform", "android");
        result.put("hardwareId", this.deviceHardwareId());
        result.put("lanAddresses", lanAddresses);
        JSObject legacy = this.legacyPreferences();
        if (legacy != null) result.put("legacy", legacy);
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

    /** What the legacy front end saved where the page cannot look
     * (hostContract.ts § HostInfo.legacy). It stored preferences per platform
     * — localStorage in a browser or Electron's renderer, but the native store
     * on a device (client/packages/common/src/hooks/useNativeClient/
     * helpers.ts) — so an upgraded tablet's remembered server and chosen mode
     * are both invisible to the page and the user re-picks each for nothing.
     *
     * Read straight out of the SharedPreferences file the Capacitor
     * Preferences plugin uses: its default group is "CapacitorStorage"
     * (PreferencesConfiguration.DEFAULTS.group) and Preferences.java stores
     * values under that name via getSharedPreferences; the legacy app never
     * configures a custom group. Handed over verbatim — JSON-encoded, exactly
     * as written — because the page's own readers validate them.
     *
     * Null when there is nothing to report, so hostInfo omits the field.
     * Getting the group wrong would be harmless: nothing is adopted and the
     * user re-picks once, exactly as they do today. */
    private JSObject legacyPreferences() {
        try {
            SharedPreferences store = super.getContext()
                .getSharedPreferences(LEGACY_PREFERENCES_GROUP, Context.MODE_PRIVATE);
            String mode = store.getString("mode", null);
            String previousServer = store.getString("previousServer", null);
            if (mode == null && previousServer == null) return null;
            JSObject legacy = new JSObject();
            if (mode != null) legacy.put("mode", mode);
            if (previousServer != null) legacy.put("previousServer", previousServer);
            return legacy;
        } catch (Exception e) {
            return null;
        }
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
        int timeoutMs = Math.min(
            Math.max(call.getInt("timeoutMs", PROBE_TIMEOUT_DEFAULT_MS), PROBE_TIMEOUT_MIN_MS),
            PROBE_TIMEOUT_MAX_MS
        );
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
            // Ignored, not rejected: navigate() returns void in the contract
            // (hostContract.ts), so there is no channel to report on, and the
            // Electron host drops a bad URL the same silent way. The page
            // never sends one — this only guards the bridge crossing.
            android.util.Log.w("OpenMSupply", "navigate: not an http(s) URL, ignored");
            call.resolve();
            return;
        }
        // Browsing stops when the page stops being on screen: mDNS is
        // continuous multicast, and nothing polls announcements() once the
        // window has left for a server. A return to discovery starts a fresh
        // search of its own (DiscoveryPage § search).
        this.stopDiscovery();
        this.connectedHost = this.hostOf(url);
        // Resolve immediately: the page has already persisted what it needs
        // (record-before-navigate, discovery.ts § connectToServer), so there
        // is no grace delay to time.
        String origin = this.originOf(url);
        // Whose server this is (hostContract.ts § ConnectedServer). The page
        // decided it; this plugin only carries it to the activity, which is
        // where certificate trust lives if the shell has any. Both the exact
        // URL and its origin go over, because the two duties that use them
        // have different scopes — see DiscoveryHostActivity.onServerChosen.
        String hardwareId = call.getString("hardwareId", "");
        int port = call.getInt("port", 0);
        boolean isLocal = Boolean.TRUE.equals(call.getBoolean("isLocal", false));
        super.getActivity().runOnUiThread(() -> {
            ((DiscoveryHostActivity) super.getActivity())
                .onServerChosen(url, origin, hardwareId, port, isLocal);
            // Host duty (AC-DT16): a host-initiated navigation is a fresh
            // start — once the target commits, drop the WebView history
            // beneath it, or hardware back re-enters discovery flagless and
            // its autoconnect bounces straight back
            // (MainActivity.clearHistoryWhenLoaded).
            ((DiscoveryHostActivity) super.getActivity()).clearHistoryWhenLoaded(origin);
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

    private String hostOf(String url) {
        try {
            return new URL(url).getHost();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * The navigation allowlist, as ONE host decided at run time.
     * Bridge.launchIntent asks every plugin before consulting its own
     * allowNavigation mask, so this is where the chosen server is granted the
     * WebView: false means "load it here", null means "not my business,
     * Capacitor decides" (which sends it to the browser).
     *
     * It has to be a runtime answer — the server's address is the user's, so
     * capacitor.config.ts cannot name it, and the wildcard that would have
     * covered it hands out the native bridge and the Java page proxy as well
     * (see the config's comment).
     *
     * Host, not full origin: a server that answered on http and redirects to
     * https, or moves port, is still the machine the user chose. Only its own
     * pages navigate here — anything else keeps Capacitor's default.
     */
    @Override
    public Boolean shouldOverrideLoad(Uri url) {
        String host = this.connectedHost;
        return host != null && host.equalsIgnoreCase(url.getHost()) ? Boolean.FALSE : null;
    }

    /** mDNS browsing and the probe thread belong to this activity, not to the
     * process: leaving them running would keep multicasting for a page that
     * is no longer on screen. */
    @Override
    protected void handleOnDestroy() {
        this.stopDiscovery();
        this.executor.shutdownNow();
        super.handleOnDestroy();
    }
}
