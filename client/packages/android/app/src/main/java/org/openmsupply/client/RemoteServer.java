package org.openmsupply.client;

import com.getcapacitor.Logger;

public class RemoteServer {
    static {
        // This will load libremote_server_android, from app/src/main/jniLib/ directory
        // matching hardware architecture
        System.loadLibrary("remote_server_android");
    }

    public RemoteServer() {

    }

    public void start(int port, String filesDir, String cacheDir, String androidId) {
        Logger.info("Starting OMS Rust Server");
        startServer(port, filesDir, cacheDir, androidId);
    }

    public void stop() {
        stopServer();
    }

    // Mapping to methods in server/android/src/android.lib
    private static native void startServer(int port, String filesDir, String cacheDir, String androidId);

    private static native void stopServer();
}
