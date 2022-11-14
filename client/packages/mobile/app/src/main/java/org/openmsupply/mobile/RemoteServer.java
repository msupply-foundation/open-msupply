package org.openmsupply.mobile;

public class RemoteServer {
    static {
        System.loadLibrary("remote_server_android");
    }

    public RemoteServer() {

    }

    public void start(int port, String filesDir, String cacheDir, String androidId) {
       startServer(port, filesDir, cacheDir, androidId);
    }

    public void stop() {
        stopServer();
    }

    private static native void startServer(int port, String filesDir, String cacheDir, String androidId);

    private static native void stopServer();
}
