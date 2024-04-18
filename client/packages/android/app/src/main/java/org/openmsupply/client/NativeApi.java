package org.openmsupply.client;

import static android.content.Context.NSD_SERVICE;

import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import androidx.annotation.MainThread;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.MalformedURLException;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Enumeration;

import javax.net.ssl.SSLHandshakeException;

@CapacitorPlugin(name = "NativeApi")
public class NativeApi extends Plugin implements NsdManager.DiscoveryListener {
    private static final String LOG_FILE_NAME = "remote_server.log";

    // This comes from Java_org_openmsupply_client_RemoteServer_startServer - if
    // it's changed there, it will need to be changed here too...
    private static final String DB_FILE_NAME = "omsupply-database";

    public static final String OM_SUPPLY = "omSupply";
    private static final Integer DEFAULT_PORT = DiscoveryConstants.PORT;
    private static final String DEFAULT_URL = "https://localhost:" + DEFAULT_PORT + "/";

    DiscoveryConstants discoveryConstants;
    JSArray discoveredServers;
    Deque<NsdServiceInfo> serversToResolve;
    FrontEndHost connectedServer;
    NsdManager discoveryManager;
    boolean isDebug;
    boolean isAdvertising;
    String localUrl;
    String serverUrl;
    boolean isDiscovering;
    boolean isResolvingServer;
    boolean shouldRestartDiscovery;

    @Override
    public void load() {
        super.load();

        CertWebViewClient client = new CertWebViewClient(this.getBridge(), this.getContext().getFilesDir(), this);
        bridge.setWebViewClient(client);

        serversToResolve = new ArrayDeque<NsdServiceInfo>();
        isResolvingServer = false;
        discoveryConstants = new DiscoveryConstants(this.getActivity().getContentResolver());
        discoveryManager = (NsdManager) this.getActivity()
                .getSystemService(NSD_SERVICE);

        String debugUrl = getConfig().getString("debugUrl");
        isDebug = debugUrl != null && !debugUrl.equals("");
        localUrl = isDebug ? debugUrl : "https://localhost:" + discoveryConstants.PORT;
        isAdvertising = false;
        isDiscovering = false;
        shouldRestartDiscovery = false;
    }

    public boolean getIsDebug() {
        return isDebug;
    }

    public FrontEndHost getConnectedServer() {
        return connectedServer;
    }

    public String getLocalUrl() {
        return localUrl;
    }

    public String getServerUrl() {
        return serverUrl;
    }

    private void sleep(int delay) {
        try {
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    protected void handleOnStart() {
        WebView webView = this.getBridge().getWebView();
        // this method (handleOnStart) is called when resuming and switching to the app
        // the webView url will be DEFAULT_URL only on the initial load
        // so this test is a quick check to see if we should be redirecting to the
        // /android loader or not
        if (!webView.getUrl().matches(DEFAULT_URL))
            return;
        // Initial load, display splash screen and wait for the server to start
        webView.post(() -> webView.loadData(SplashPage.encodedHtml, "text/html", "base64"));
        // advertiseService();
        Thread thread = new Thread(new Runnable() {
            @Override
            public void run() {
                Boolean isServerRunning = false;
                Integer retryCount = 5;
                while (!isServerRunning && retryCount > 0) {
                    try {
                        URL url = new URL(localUrl);
                        HttpURLConnection urlc = (HttpURLConnection) url.openConnection();
                        // actually no point - the timeout only applies when trying to find a server
                        // when using localhost it returns immediately even if the server isn't
                        // responding
                        urlc.setConnectTimeout(1000);
                        urlc.connect();
                        if (urlc.getResponseCode() == 200) {
                            isServerRunning = true;
                        }
                    } catch (SSLHandshakeException e) {
                        // server is running and responding with an SSL error
                        // which we will ignore, so ok to proceed
                        isServerRunning = true;
                    } catch (Exception e) {
                        Log.e(OM_SUPPLY, e.getMessage());
                        isServerRunning = false;
                    }
                    retryCount--;
                    sleep(1000);
                }

                // .post to run on UI thread in the two calls below
                if (isServerRunning) {
                    webView.post(() -> webView.loadUrl(localUrl + "/android"));
                } else {
                    Log.e(OM_SUPPLY, "Server not running, displaying error page");
                    webView.post(() -> webView.loadData(ErrorPage.encodedHtml, "text/html", "base64"));
                }
            }
        });
        thread.start();
    }

    @Override
    protected void handleOnStop() {
        stopServerDiscovery();
    }

    @PluginMethod()
    public void goBackToDiscovery(PluginCall call) {
        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(localUrl + "/discovery?autoconnect=false"));
    }

    // Advertise local remote server on network
    @PluginMethod()
    public void advertiseService(PluginCall call) {
        if (isAdvertising) {
            return;
        }
        NsdServiceInfo serviceInfo = createLocalServiceInfo();

        discoveryManager = (NsdManager) this.getActivity()
                .getSystemService(NSD_SERVICE);

        discoveryManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD,
                new NsdManager.RegistrationListener() {
                    @Override
                    public void onServiceRegistered(NsdServiceInfo NsdServiceInfo) {
                    }

                    @Override
                    public void onRegistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
                    }

                    @Override
                    public void onServiceUnregistered(NsdServiceInfo arg0) {
                    }

                    @Override
                    public void onUnregistrationFailed(NsdServiceInfo serviceInfo, int errorCode) {
                    }
                });
        isAdvertising = true;
        // See method comment
        addLocalServerToDiscovery();
    }

    private void stopServerDiscovery() {
        if (!isDiscovering) {
            return;
        }

        try {
            discoveryManager.stopServiceDiscovery(this);
        } catch (Exception e) {
            Logger.error("Service discovery cannot be stopped " + e);
        }
    }

    @PluginMethod()
    public void startServerDiscovery(PluginCall call) {
        if (isDiscovering) {
            shouldRestartDiscovery = true;
            stopServerDiscovery();
            return;
        }

        shouldRestartDiscovery = false;
        discoveredServers = new JSArray();

        // Some navigation events may cause server discovery to still be ongoing
        try {
            // `this` would be NsdManager.DiscoveryListener, and main method is
            // onServiceFound
            discoveryManager.discoverServices(discoveryConstants.SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, this);
        } catch (Exception e) {
            Logger.error("Cannot start server discovery " + e);
        }
    }

    // Return discoveredServers and reset discoveredServers array
    // (to avoid large array being sent to client,
    // since duplicates in discoveredServers are frequent)
    @PluginMethod()
    public void discoveredServers(PluginCall call) {
        JSObject result = new JSObject();
        result.put("servers", discoveredServers);
        discoveredServers = new JSArray();

        call.resolve(result);
    }

    @PluginMethod()
    public void connectedServer(PluginCall call) {
        call.resolve(connectedServer == null ? null : connectedServer.data);
    }

    private void onConnectToServer(FrontEndHost server) {
        stopServerDiscovery();
        connectedServer = server;

        String url = isDebug ? localUrl
                : server.getUrl();

        Bridge bridge = this.getBridge();
        WebView webView = bridge.getWebView();
        this.serverUrl = url;
        // .post to run on UI thread
        webView.post(() -> webView.loadUrl(server.getConnectionUrl()));
    }

    @PluginMethod()
    public void connectToServer(PluginCall call) throws MalformedURLException {
        FrontEndHost server = new FrontEndHost(call.getData());
        JSObject response = new JSObject();

        try {
            URL url = new URL(server.getConnectionUrl());
            HttpURLConnection urlc = (HttpURLConnection) url.openConnection();
            urlc.setRequestMethod("GET");
            urlc.connect();
            int status = urlc.getResponseCode();

            if (status == 200) {
                onConnectToServer(server);
                response.put("success", true);
            } else {
                response.put("success", false);
                response.put("error", "Connecting to server: response code=" + status);
            }
        } catch (SSLHandshakeException e) {
            // server is running and responding with an SSL error
            // which we will ignore, so ok to proceed
            onConnectToServer(server);
            response.put("success", true);
        } catch (IOException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        call.resolve(response);
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onServiceFound(NsdServiceInfo serviceInfo) {
        if (!serviceInfo.getServiceName().startsWith(discoveryConstants.SERVICE_NAME)) {
            return;
        }

        serversToResolve.push(serviceInfo);
        tryResolveServer();
    }

    private void tryResolveServer() {
        if (isResolvingServer) {
            return;
        }

        isResolvingServer = true;

        if (serversToResolve.peek() == null) {
            isResolvingServer = false;
            return;
        }

        NsdServiceInfo serviceInfo = serversToResolve.pop();

        discoveryManager.resolveService(serviceInfo, new NsdManager.ResolveListener() {
            @Override
            public void onServiceResolved(NsdServiceInfo serviceInfo) {
                if (!serviceInfo.getServiceName().startsWith(discoveryConstants.SERVICE_NAME)) {
                    return;
                }

                JSObject server = serviceInfoToObject(serviceInfo);

                discoveredServers.put(server);
                isResolvingServer = false;
                tryResolveServer();
            }

            // NsdManager.ResolveListener
            @Override
            public void onResolveFailed(NsdServiceInfo serviceInfo, int errorCode) {
                isResolvingServer = false;
                tryResolveServer();
            }
        });
    }

    // Attempt to get a non-loopback address for the local server
    // and fallback to loopback if there is an error
    private String getHostAddress(NsdServiceInfo serviceInfo, Boolean isLocal) {
        if (!isLocal) {
            return serviceInfo.getHost().getHostAddress();
        }
        try {
            for (Enumeration<NetworkInterface> en = NetworkInterface.getNetworkInterfaces(); en.hasMoreElements();) {
                NetworkInterface ni = en.nextElement();
                for (Enumeration<InetAddress> enumIpAddr = ni.getInetAddresses(); enumIpAddr.hasMoreElements();) {
                    InetAddress inetAddress = enumIpAddr.nextElement();
                    if (!inetAddress.isLoopbackAddress() && !inetAddress.isLinkLocalAddress()
                            && inetAddress.isSiteLocalAddress()) {
                        return inetAddress.getHostAddress();
                    }
                }
            }
        } catch (Exception ex) {
            Log.e(OM_SUPPLY, ex.toString());
        }
        InetAddress host = serviceInfo.getHost();
        // this will happen if there is no network interface available
        if (host == null) {
            return "127.0.0.1";
        }
        return host.getHostAddress();
    }

    private JSObject serviceInfoToObject(NsdServiceInfo serviceInfo) {
        String serverHardwareId = parseAttribute(serviceInfo, discoveryConstants.HARDWARE_ID_KEY);
        Boolean isLocal = serverHardwareId.equals(discoveryConstants.hardwareId);
        return new JSObject()
                .put("protocol", parseAttribute(serviceInfo, discoveryConstants.PROTOCOL_KEY))
                .put("clientVersion", parseAttribute(serviceInfo, discoveryConstants.CLIENT_VERSION_KEY))
                .put("port", serviceInfo.getPort())
                .put("ip", getHostAddress(serviceInfo, isLocal))
                .put("hardwareId", serverHardwareId)
                .put("isLocal", isLocal);

    }

    private NsdServiceInfo createLocalServiceInfo() {
        NsdServiceInfo serviceInfo = new NsdServiceInfo();
        serviceInfo.setServiceName(discoveryConstants.SERVICE_NAME);
        serviceInfo.setServiceType(discoveryConstants.SERVICE_TYPE);
        serviceInfo.setPort(discoveryConstants.PORT);
        serviceInfo.setAttribute(discoveryConstants.PROTOCOL_KEY, "https");
        serviceInfo.setAttribute(discoveryConstants.CLIENT_VERSION_KEY, "unspecified");
        serviceInfo.setAttribute(discoveryConstants.HARDWARE_ID_KEY, discoveryConstants.hardwareId);
        return serviceInfo;
    }

    // Had issues resolving local server when wifi and mobile data is off
    // getting onResolveFailed with errorCode = 0 (internal error) with no more
    // information
    // manually adding this server should work
    private void addLocalServerToDiscovery() {
        if (isAdvertising && isDiscovering && discoveredServers != null) {
            try {
                NsdServiceInfo serviceInfo = createLocalServiceInfo();
                serviceInfo.setHost(InetAddress.getByName("localhost"));
                discoveredServers.put(serviceInfoToObject(serviceInfo));
            } catch (Exception E) {
                Log.d(OM_SUPPLY, "problem adding localhost to discovery");
            }
        }
    }

    private String parseAttribute(NsdServiceInfo serviceInfo, String name) {
        byte[] attributeBytes = serviceInfo.getAttributes().get(name);
        if (attributeBytes == null) {
            throw new RuntimeException();
        }
        return new String(attributeBytes, StandardCharsets.UTF_8);
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onServiceLost(NsdServiceInfo service) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onStartDiscoveryFailed(String serviceType, int errorCode) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onStopDiscoveryFailed(String serviceType, int errorCode) {
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onDiscoveryStarted(String serviceType) {
        isDiscovering = true;
        // See method comment
        addLocalServerToDiscovery();
    }

    // NsdManager.DiscoveryListener
    @Override
    public void onDiscoveryStopped(String serviceType) {
        isDiscovering = false;
        if (shouldRestartDiscovery) {
            startServerDiscovery(null);
        }
    }

    @PluginMethod()
    public void readLog(PluginCall call) {
        JSObject response = new JSObject();
        StringBuilder sb = new StringBuilder();

        try {
            File file = new File(getContext().getFilesDir(), LOG_FILE_NAME);
            BufferedReader br = new BufferedReader(new FileReader(file));
            String line;

            while ((line = br.readLine()) != null) {
                sb.append(line);
                sb.append("\n");
            }
            br.close();
            response.put("log", sb.toString());
        } catch (IOException e) {
            response.put("log", "Error: Unable to read log file!");
            response.put("error", e.getMessage());
        }
        call.resolve(response);
    }

    @PluginMethod()
    public void saveFile(@NonNull PluginCall call) {
        JSObject data = call.getData();
        JSObject response = new JSObject();

        String filename = data.getString("filename", LOG_FILE_NAME);
        String content = data.getString("content");

        if (content == null) {
            response.put("error", "No content");
            response.put("success", false);
        } else {
            MainActivity mainActivity = (MainActivity) getActivity();
            mainActivity.SaveFile(filename, content);
            response.put("success", true);
        }

        call.resolve(response);
    }

    @PluginMethod()
    public void saveDatabase(@NonNull PluginCall call) {
        JSObject data = call.getData();
        JSObject response = new JSObject();

        MainActivity mainActivity = (MainActivity) getActivity();

        File file = new File(getContext().getFilesDir(), DB_FILE_NAME);
        mainActivity.SaveDatabase(file);
        response.put("success", true);

        call.resolve(response);
    }

    /** Helper class to get access to the JS FrontEndHost data */
    public class FrontEndHost {
        JSObject data;

        public FrontEndHost(JSObject data) {
            String ip = data.getString("ip");
            // attempt to translate loopback addresses to an actual IP address
            // so that we can display the local server IP for users to connect to the API
            if (data.getBool("isLocal") && (ip.equals("127.0.0.1") || ip.equals("localhost"))) {
                NsdServiceInfo serviceInfo = createLocalServiceInfo();
                data.put("ip", getHostAddress(serviceInfo, true));
            }
            this.data = data;
        }

        /**
         * Constructs the server's base url string including protocol, ip and port,
         * e.g. https://127.0.0.1:8000
         */
        public String getUrl() {
            String host = data.getBool("isLocal") ? "localhost" : data.getString("ip");
            return data.getString("protocol") + "://" + host + ":" + data.getString("port");
        }

        /**
         * Constructs the url to be used when connecting to a server,
         * e.g. https://127.0.0.1:8000/login
         */
        public String getConnectionUrl() {
            String path = "";
            if (data.getString("path") != null) {
                path = "/" + data.getString("path");
            }
            return getUrl() + path;
        }

        public boolean isLocal() {
            return data.getBool("isLocal");
        }

        public String getHardwareId() {
            return data.getString("hardwareId");
        }

        public int getPort() {
            return data.getInteger("port");
        }
    }
}