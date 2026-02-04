package com.honeywell.barcodeexample;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.Toast;
import android.content.pm.ActivityInfo;

import com.honeywell.aidc.*;

public class AutomaticBarcodeActivity extends Activity implements BarcodeReader.BarcodeListener,
        BarcodeReader.TriggerListener {

    private com.honeywell.aidc.BarcodeReader barcodeReader;
    private ListView barcodeList;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_barcode);

        if(Build.MODEL.startsWith("VM1A")) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        }
        else{
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }

        // get bar code instance from MainActivity
        barcodeReader = MainActivity.getBarcodeObject();

        if (barcodeReader != null) {

            // register bar code event listener
            barcodeReader.addBarcodeListener(this);

            // set the trigger mode to client control
            try {
                barcodeReader.setProperty(BarcodeReader.PROPERTY_TRIGGER_CONTROL_MODE,
                       BarcodeReader.TRIGGER_CONTROL_MODE_AUTO_CONTROL);
               
            } catch (UnsupportedPropertyException e) {
                Toast.makeText(this, "Failed to apply properties", Toast.LENGTH_SHORT).show();
            }
            // register trigger state change listener
            barcodeReader.addTriggerListener(this);

            Map<String, Object> properties = new HashMap<String, Object>();
            // Set Symbologies On/Off
            properties.put(BarcodeReader.PROPERTY_CODE_128_ENABLED, true);
            properties.put(BarcodeReader.PROPERTY_GS1_128_ENABLED, true);
            properties.put(BarcodeReader.PROPERTY_QR_CODE_ENABLED, true);
            properties.put(BarcodeReader.PROPERTY_CODE_39_ENABLED, true);
            properties.put(BarcodeReader.PROPERTY_DATAMATRIX_ENABLED, true);
            properties.put(BarcodeReader.PROPERTY_UPC_A_ENABLE, true);
            properties.put(BarcodeReader.PROPERTY_EAN_13_ENABLED, false);
            properties.put(BarcodeReader.PROPERTY_AZTEC_ENABLED, false);
            properties.put(BarcodeReader.PROPERTY_CODABAR_ENABLED, false);
            properties.put(BarcodeReader.PROPERTY_INTERLEAVED_25_ENABLED, false);
            properties.put(BarcodeReader.PROPERTY_PDF_417_ENABLED, false);
            // Set Max Code 39 barcode length
            properties.put(BarcodeReader.PROPERTY_CODE_39_MAXIMUM_LENGTH, 10);
            // Turn on center decoding
            properties.put(BarcodeReader.PROPERTY_CENTER_DECODE, true);
            // Enable bad read response
            properties.put(BarcodeReader.PROPERTY_NOTIFICATION_BAD_READ_ENABLED, true);
           /* // Sets time period for decoder timeout in any mode
            properties.put(BarcodeReader.PROPERTY_DECODER_TIMEOUT,  400);
            try {
                properties.put(BarcodeReader.PROPERTY_TRIG_PRES_MODE, true);
                properties.put(BarcodeReader.PROPERTY_TRIG_PRES_AIMER_ON, true);
                properties.put(BarcodeReader.PROPERTY_TRIG_PRES_ILLUM_ON_TIME, 3000);
                properties.put(BarcodeReader.PROPERTY_TRIG_PRES_IDLE_ILLUM_ON, true);
                properties.put(BarcodeReader.PROPERTY_TRIG_PRES_IDLE_ILLUM_ON_INTENSITY, 50);
              //  barcodeReader.softwareTrigger(true);

            } catch (Exception exception) {
                Log.d("ClientBarcode", exception.getMessage());
            }*/
            properties.put(BarcodeReader.PROPERTY_INTERLEAVED_25_ENABLED,  true);
            properties.put(BarcodeReader.PROPERTY_INTERLEAVED_25_REDUNDANCY_MODE,  10);
            properties.put(BarcodeReader.PROPERTY_LINEAR_VOID_HANDLING,  false);
            properties.put(BarcodeReader.PROPERTY_DATA_PROCESSOR_LAUNCH_BROWSER,false);
            /* Combined regex contains two items
                            1 Customized format and is for content start with 2 letter(ignore case) amd followed by 3 digit
                            2 Embedded format for IP format xx.xx.xx.xx
                        */
            String comreg = "[{\"enabled\":true,\"key\":\"chanum\",\"regexValue\":\"[A-Z a-z]{2}\\\\d{3}\",\"type\":\"CUSTOMIZED\"}," +
                    "{\"enabled\":true,\"key\":\"OCR_CONTENT_REGEX_IP_ADDRESS\",\"type\":\"EMBEDDED\"}]";
            properties.put(BarcodeReader.PROPERTY_OCR_ENABLED,true);
            properties.put(BarcodeReader.PROPERTY_OCR_EXCLUSIVE,true);
            properties.put(BarcodeReader.PROPERTY_OCR_CONTENT_REGEX_SEQUENCE,comreg);
            // Apply the settings
            barcodeReader.setProperties(properties);
        }

        // get initial list
        barcodeList = (ListView) findViewById(R.id.listViewBarcodeData);
    }

    @Override
    public void onBarcodeEvent(final BarcodeReadEvent event) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                // update UI to reflect the data
                List<String> list = new ArrayList<String>();
                list.add("Barcode data: " + event.getBarcodeData());
                list.add("Character Set: " + event.getCharset());
                list.add("Code ID: " + event.getCodeId());
                list.add("AIM ID: " + event.getAimId());
                list.add("Timestamp: " + event.getTimestamp());

                final ArrayAdapter<String> dataAdapter = new ArrayAdapter<String>(
                        AutomaticBarcodeActivity.this, android.R.layout.simple_list_item_1, list);

                barcodeList.setAdapter(dataAdapter);
            }
        });
    }

    // When using Automatic Trigger control do not need to implement the
    // onTriggerEvent function
    @Override
    public void onTriggerEvent(TriggerStateChangeEvent event) {
    }

    @Override
    public void onFailureEvent(BarcodeFailureEvent arg0) {
    }

    @Override
    public void onResume() {
        super.onResume();
        if (barcodeReader != null) {
            try {
                barcodeReader.claim();
            } catch (ScannerUnavailableException e) {
//                e.printStackTrace();
                Toast.makeText(this, "Scanner unavailable", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (barcodeReader != null) {
            // release the scanner claim so we don't get any scanner
            // notifications while paused.
            barcodeReader.release();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (barcodeReader != null) {
            // unregister barcode event listener
            barcodeReader.removeBarcodeListener(this);

            // unregister trigger state change listener
            barcodeReader.removeTriggerListener(this);
        }
    }
}
