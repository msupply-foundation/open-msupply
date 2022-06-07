package org.openmsupply.client;

import android.os.Bundle;
import android.provider.Settings;

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
        String androidId = Settings.Secure.getString(getContentResolver(),
                Settings.Secure.ANDROID_ID);
        server.start(8000, path, cache, androidId);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }
}
