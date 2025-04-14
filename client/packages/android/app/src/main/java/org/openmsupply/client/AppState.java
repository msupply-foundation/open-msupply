package org.openmsupply.client;
public class AppState {
    private static final AppState instance = new AppState();
    private boolean isServerReady = false;
    private AppState() {} // Private constructor
    public static AppState getInstance() {
        return instance;
    }
    public boolean isServerReady() {
        return isServerReady;
    }
    public void setServerReady(boolean serverReady) {
        isServerReady = serverReady;
    }
}
