package org.openmsupply.client;
public class AppState {
    private static final AppState instance = new AppState();
    // Tracks whether the WebView has been given its initial content (the inline
    // LoadingPage). Gates native-splash dismissal and is used as the "have we
    // already gone through cold-start setup?" signal for warm-resume detection.
    // NOT a signal about Rust server readiness.
    private boolean isWebViewReady = false;
    private AppState() {} // Private constructor
    public static AppState getInstance() {
        return instance;
    }
    public boolean isWebViewReady() {
        return isWebViewReady;
    }
    public void setWebViewReady(boolean webViewReady) {
        isWebViewReady = webViewReady;
    }
}
