package org.openmsupply.client;

import android.content.ContentResolver;
import android.provider.Settings;

public class DiscoveryConstants {
    public static final String SERVICE_TYPE = "_omsupply._tcp";
    public static final String SERVICE_NAME = "omSupplyServer";
    public static final String PROTOCOL_KEY = "protocol";
    public static final String CLIENT_VERSION_KEY = "client_version";
    public static final String HARDWARE_ID_KEY = "hardware_id";
    // Need to change url in capacitor.config.ts if this is changed
    public static final Integer PORT = 8000;

    public String hardwareId;

    public DiscoveryConstants(ContentResolver resolver) {
        hardwareId = Settings.Secure.getString(resolver,
                Settings.Secure.ANDROID_ID);
    }
}
