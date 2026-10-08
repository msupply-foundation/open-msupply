package org.openmsupply.client;

// Package name MUST stay org.openmsupply.client: the JNI symbols in the
// prebuilt libremote_server_android.so are bound to this class's fully
// qualified name (Java_org_openmsupply_client_RemoteServer_startServer).
public class RemoteServer {
    // The library is optional: the dev loop (host backend) doesn't bundle it,
    // only embedded-server builds do (.so manually sourced into jniLibs —
    // see kdd/android/android-spec.md).
    private static final boolean loaded = tryLoad();

    private static boolean tryLoad() {
        try {
            System.loadLibrary("remote_server_android");
            return true;
        } catch (UnsatisfiedLinkError e) {
            android.util.Log.w("OpenMSupply",
                "Embedded server library not bundled — running without the on-device server");
            return false;
        }
    }

    public RemoteServer() {
    }

    public boolean isAvailable() {
        return loaded;
    }

    public void start(int port, String filesDir, String cacheDir, String androidId) {
        if (!loaded) return;
        android.util.Log.i("OpenMSupply", "Starting OMS Rust server on port " + port);
        startServer(port, filesDir, cacheDir, androidId);
    }

    public void stop() {
        if (!loaded) return;
        stopServer();
    }

    private static native void startServer(int port, String filesDir, String cacheDir, String androidId);

    private static native void stopServer();
}
