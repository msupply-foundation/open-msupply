package org.openmsupply.client;

import android.content.Context;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.honeywell.aidc.AidcManager;
import com.honeywell.aidc.AidcManager.CreatedCallback;
import com.honeywell.aidc.BarcodeFailureEvent;
import com.honeywell.aidc.BarcodeReadEvent;
import com.honeywell.aidc.BarcodeReader;
import com.honeywell.aidc.ScannerUnavailableException;
import com.honeywell.aidc.ScannerNotClaimedException;

import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "HoneywellScanner")
public class HoneywellScannerPlugin extends Plugin implements BarcodeReader.BarcodeListener {
    private static final String TAG = "HoneywellScanner";
    private BarcodeReader barcodeReader;
    private AidcManager manager;
    private PluginCall listenerCall;

    @Override
    public void load() {
        super.load();
        
        Context context = getContext().getApplicationContext();
        AidcManager.create(context, new CreatedCallback() {
            @Override
            public void onCreated(AidcManager aidcManager) {
                manager = aidcManager;
                barcodeReader = manager.createBarcodeReader();
                if (barcodeReader != null) {
                    configureBarcodeReader();
                    barcodeReader.addBarcodeListener(HoneywellScannerPlugin.this);
                    try {
                        barcodeReader.claim();
                    } catch (ScannerUnavailableException e) {
                        Log.e(TAG, "Scanner unavailable during initialization", e);
                    }
                }
            }
        });
    }

    private void configureBarcodeReader() {
        Map<String, Object> properties = new HashMap<>();
        
        // Set Symbologies On/Off
        properties.put(BarcodeReader.PROPERTY_CODE_128_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_GS1_128_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_QR_CODE_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_CODE_39_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_DATAMATRIX_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_UPC_A_ENABLE, true);
        properties.put(BarcodeReader.PROPERTY_EAN_13_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_EAN_8_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_AZTEC_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_CODABAR_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_INTERLEAVED_25_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_PDF_417_ENABLED, true);
        
        // Set Max Code 39 barcode length
        properties.put(BarcodeReader.PROPERTY_CODE_39_MAXIMUM_LENGTH, 10);
        
        // Turn on center decoding
        properties.put(BarcodeReader.PROPERTY_CENTER_DECODE, false);
        
        // Disable bad read response, handle in onFailureEvent
        properties.put(BarcodeReader.PROPERTY_NOTIFICATION_BAD_READ_ENABLED, false);

        // Also send the EAN-13 and EAN-8 check digit within the payload.
        properties.put(BarcodeReader.PROPERTY_EAN_13_CHECK_DIGIT_TRANSMIT_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_EAN_8_CHECK_DIGIT_TRANSMIT_ENABLED, true);
        properties.put(BarcodeReader.PROPERTY_UPC_A_CHECK_DIGIT_TRANSMIT_ENABLED, true);

        // If this is not set to true, an EAN-13 starting with 00 will have the first
        // zero removed.
        properties.put(BarcodeReader.PROPERTY_UPC_A_TRANSLATE_EAN13, true);

        // Stops the scanner from attempting to open a browser if a URL is scanned
        properties.put(BarcodeReader.PROPERTY_DATA_PROCESSOR_LAUNCH_BROWSER, false);

        // Apply the settings
        barcodeReader.setProperties(properties);
    }



    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void listen(PluginCall call) {
        if (barcodeReader == null) {
            call.reject("Barcode reader not initialized");
            return;
        }
        
        // Claim the scanner
        try {
            barcodeReader.claim();
            Log.i(TAG, "Scanner claimed");
        } catch (ScannerUnavailableException e) {
            Log.e(TAG, "Scanner unavailable", e);
            call.reject("Scanner unavailable", e);
            return;
        }
        
        // Save the call to send events back
        listenerCall = call;
        call.setKeepAlive(true);
        
        Log.i(TAG, "Listening for scans");
    }

    @PluginMethod
    public void release(PluginCall call) {
        if (barcodeReader != null) {
            try {
                barcodeReader.release();
                // Stop any ongoing scan
                barcodeReader.softwareTrigger(false);
                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Error in release", e);
                call.reject("Error releasing scanner", e);
            }
        } else {
            call.reject("Barcode reader not initialized");
        }
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", barcodeReader != null);
        call.resolve(result);
    }

    @Override
    public void onBarcodeEvent(BarcodeReadEvent barcodeReadEvent) {
        Log.i(TAG, "Barcode read event received");
        if (listenerCall != null) {
            JSObject data = new JSObject();
            data.put("barcode", barcodeReadEvent.getBarcodeData());
            data.put("type", "scan");
            
            // Resolve with data and keep callback alive
            listenerCall.resolve(data);
        }
    }

    @Override
    public void onFailureEvent(BarcodeFailureEvent barcodeFailureEvent) {
        Log.i(TAG, "Barcode read failure received");
        if (listenerCall != null) {
            JSObject data = new JSObject();
            data.put("error", "Scan has failed");
            data.put("type", "error");
            
            // Reject with error message and keep callback alive
            listenerCall.reject("Scan has failed");
        }
    }

    @Override
    protected void handleOnResume() {
        Log.i(TAG, "Barcode handleOnResume");
        super.handleOnResume();
        if (barcodeReader != null) {
            try {
                barcodeReader.claim();
            } catch (ScannerUnavailableException e) {
                Log.e(TAG, "Scanner unavailable on resume", e);
            } catch (Exception e) {
                Log.e(TAG, "Error on resume", e);
            }
        }
    }

    @Override
    protected void handleOnPause() {
        Log.i(TAG, "Barcode handleOnPause");
        super.handleOnPause();
        if (barcodeReader != null) {
            try {
                barcodeReader.release();
            } catch (Exception e) {
                Log.e(TAG, "Error on pause", e);
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        Log.i(TAG, "Barcode handleOnDestroy");
        super.handleOnDestroy();
        
        if (barcodeReader != null) {
            barcodeReader.close();
            barcodeReader = null;
        }

        if (manager != null) {
            manager.close();
        }
    }
}
