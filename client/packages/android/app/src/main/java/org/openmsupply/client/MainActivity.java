package org.openmsupply.client;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import org.openmsupply.client.certplugin.CertPlugin;

public class MainActivity extends BridgeActivity {
    RemoteServer server = new RemoteServer();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(CertPlugin.class);

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        server.start(8000, path, cache);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }
}
