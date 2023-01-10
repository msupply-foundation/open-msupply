package org.openmsupply.client;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import org.openmsupply.client.certplugin.CertPlugin;

public class MainActivity extends BridgeActivity {
    RemoteServer server = new RemoteServer();
    DiscoveryConstants discoveryConstants;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeApi.class);
        registerPlugin(CertPlugin.class);
        super.onCreate(savedInstanceState);

        discoveryConstants = new DiscoveryConstants(getContentResolver());

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        server.start(discoveryConstants.PORT, path, cache, discoveryConstants.hardwareId);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }
}

