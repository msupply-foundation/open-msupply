package org.openmsupply.client;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.File;

public class MainActivity extends BridgeActivity {
    RemoteServer server = new RemoteServer();
    DiscoveryConstants discoveryConstants;
    private FileManager fileManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeApi.class);
        super.onCreate(savedInstanceState);

        discoveryConstants = new DiscoveryConstants(getContentResolver());
        fileManager = new FileManager(this);

        String path = getFilesDir().getAbsolutePath();
        String cache = getCacheDir().getAbsolutePath();
        server.start(discoveryConstants.PORT, path, cache, discoveryConstants.hardwareId);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        server.stop();
    }

    // ActivityResult needs to be overridden in the main, not UI thread
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        fileManager.onActivityResult(requestCode, resultCode, data);
    }

    // Implementing here, so that we can use the FileManager instance
    public void SaveFile(String filename, String content) {
        fileManager.Save(filename, content);
    }

    public void SaveDatabase(File file) {
        fileManager.SaveDatabase(file);
    }
}
