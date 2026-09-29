package org.openmsupply.client;

/**
 * What {@link DiscoveryHostPlugin} needs from whichever activity is hosting
 * it. Both Android projects declare their own MainActivity in this package
 * (the new frontend's shell and the shipping transition APK), so the shared
 * plugin cannot name either one — it asks through this instead.
 *
 * Only the back-stack duty needs the activity: everything else the plugin
 * does it does through the Capacitor bridge.
 */
public interface DiscoveryHostActivity {
    /**
     * Drop the WebView's history once a page whose URL starts with
     * {@code urlPrefix} has loaded (host duty AC-DT16 — see the plugin's
     * navigate()). Called on the UI thread.
     */
    void clearHistoryWhenLoaded(String urlPrefix);

    /**
     * The server the page has just chosen, told to the activity before the
     * WebView is pointed at it (hostContract.ts § ConnectedServer).
     *
     * Certificate trust needs it: open-mSupply servers are self-signed, so
     * every connection raises an SSL error the shell has to answer, and the
     * answer depends on whose server it is — this device's own can be proved
     * against the certificate it wrote to disk, anyone else's can only be
     * trusted on first use, keyed by {@code hardwareId} and {@code port}
     * (spec/android § connection trust). {@code hardwareId} is a per-attempt
     * id, not an announced one, for a manually entered server
     * (hostContract.ts § ConnectedServer).
     *
     * Both the exact {@code url} and its {@code origin} are given because the
     * two duties that consume them have different scopes:
     *
     * <ul>
     * <li>{@code origin} for certificate trust. The SSL error is raised per
     * REQUEST — the document, then every script, style and GraphQL call — so a
     * trust rule matched against the full URL would answer the first request
     * and let the rest of the page fall to the default refusal. The old front
     * end's path has always matched by origin
     * (CertWebViewClient.onReceivedSslError).</li>
     * <li>{@code url} for the failed-load duty (AC-DT4), which is about THIS
     * hand-off failing to serve — deliberately not any later navigation on a
     * server the user is already signed in to.</li>
     * </ul>
     *
     * Default no-op: a shell with no certificate trust to key — the new
     * frontend's spike shell accepts any certificate — needs to do nothing
     * with it.
     */
    default void onServerChosen(
            String url,
            String origin,
            String hardwareId,
            int port,
            boolean isLocal) {}
}
