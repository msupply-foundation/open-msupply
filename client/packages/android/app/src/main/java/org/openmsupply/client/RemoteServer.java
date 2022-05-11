package org.openmsupply.client;


public class RemoteServer {
    private long handle = -1;

    static {
        System.loadLibrary("remote_server_android");
    }

    public String getName() {
        return "RemoteServer";
    }

    public RemoteServer() {}

    public String sayHelloWorld(String name) {
        return rustHelloWorld(name);
    }

    public void start(int port, String dbPath, String cacheDir) {
        handle = startServer(port, dbPath, cacheDir);
    }

    public void stop() {
        if (handle > 0) {
            stopServer(handle);
            handle = 1;
        }
    }

    private static native String rustHelloWorld(String seed);

    private static native long startServer(int port, String dbPath, String cacheDir);
    private static native int stopServer(long handle);
}
