package org.openmsupply.client;

// Package name MUST stay org.openmsupply.client: the JNI symbols in the
// prebuilt libremote_server_android.so are bound to this class's fully
// qualified name (Java_org_openmsupply_client_RemoteServer_startServer).
public class RemoteServer {
    static {
        System.loadLibrary("remote_server_android");
    }

    public RemoteServer() {
    }

    public void start(int port, String filesDir, String cacheDir, String androidId) {
        android.util.Log.i("OpenMSupply", "Starting OMS Rust server on port " + port);
        startServer(port, filesDir, cacheDir, androidId);
    }

    public void stop() {
        stopServer();
    }

    private static native void startServer(int port, String filesDir, String cacheDir, String androidId);

    private static native void stopServer();
}
