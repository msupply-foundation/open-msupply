package org.openmsupply.client;

import android.os.Bundle;
import android.os.Environment;

import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {
    RemoteServer server = new RemoteServer();
    DiscoveryConstants discoveryConstants;
    static String logPath = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS) + File.separator + "omSupply";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeApi.class);
        super.onCreate(savedInstanceState);

        discoveryConstants = new DiscoveryConstants(getContentResolver());

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        File logFolder = new File(logPath);
        logFolder.mkdir();
        server.start(discoveryConstants.PORT, path, cache, discoveryConstants.hardwareId, logFolder.getAbsolutePath());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }
}

