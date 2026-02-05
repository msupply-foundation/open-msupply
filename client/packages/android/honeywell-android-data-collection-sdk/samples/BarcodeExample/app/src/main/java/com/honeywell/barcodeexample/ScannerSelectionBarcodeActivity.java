package com.honeywell.barcodeexample;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.MotionEvent;
import android.view.View;
import android.view.View.OnClickListener;
import android.view.View.OnTouchListener;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.Toast;
import android.widget.AdapterView.OnItemClickListener;
import android.content.pm.ActivityInfo;

import com.honeywell.aidc.*;
import com.honeywell.aidc.AidcManager.BarcodeDeviceListener;
import com.honeywell.aidc.AidcManager.CreatedCallback;
import com.honeywell.aidc.ScannerUnavailableException;
import com.honeywell.aidc.InvalidScannerNameException;


public class ScannerSelectionBarcodeActivity extends Activity implements
        BarcodeReader.BarcodeListener, BarcodeReader.TriggerListener {

    private com.honeywell.aidc.AidcManager mAidcManager;
    private com.honeywell.aidc.BarcodeReader mBarcodeReader;
    private final Context mContext = this;
    private String mConnectedScanner = null;
    private Button mSwitchScannersButton;
    private ListView barcodeList;
    private boolean mResume = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_selection_barcode);

        if(Build.MODEL.startsWith("VM1A")) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        }
        else{
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }

        // get initial list
        barcodeList = (ListView) findViewById(R.id.listViewBarcodeData);

        mSwitchScannersButton = (Button) findViewById(R.id.buttonSwitchScanners);
        mSwitchScannersButton.setOnTouchListener(new OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if (event.getAction() == MotionEvent.ACTION_DOWN) {
                    scannerSelection(mAidcManager.listConnectedBarcodeDevices());
                }
                return true;
            }
        });

        /*
         * Get new AidcManager
         */
        AidcManager.create(this, new CreatedCallback() {

            @Override
            public void onCreated(AidcManager aidcManager) {
                mAidcManager = aidcManager;
                mAidcManager.addBarcodeDeviceListener(new BarcodeDeviceListener() {

                    @Override
                    public void onBarcodeDeviceConnectionEvent(BarcodeDeviceConnectionEvent event) {
                        // Could use this to call scannerSelection like when
                        // press switch scanner button.
                        // Here we just use it to notify the user when a scanner
                        // is attached or detached and
                        // give a toast.
                        String connected;
                        if (event.getConnectionStatus() == AidcManager.BARCODE_DEVICE_DISCONNECTED) {
                            connected = "Disconnected";
                        } else {
                            connected = "Connected";
                        }

                        // Only act on the event if the app is in the resume state. The app could
                        // store the connection event and BarcodeReaderInfo object if the app is
                        // not in the resume state so the proper imager claim can be made in onResume
                        if (mResume) {
                            final String message = "Scanner: "
                                    + event.getBarcodeReaderInfo().getFriendlyName() + " is "
                                    + connected;
                            ((Activity) mContext).runOnUiThread(new Runnable() {

                                @Override
                                public void run() {
                                    Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
                                }

                            });
                        }
                    }
                });
                initialize();
            }
        });
    }

    public void initialize() {
        scannerSelection(mAidcManager.listConnectedBarcodeDevices());
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
                        ScannerSelectionBarcodeActivity.this, android.R.layout.simple_list_item_1,
                        list);

                barcodeList.setAdapter(dataAdapter);
            }
        });
    }

    // When using Automatic Trigger control do not need to implement the
    // onTriggerEvent function
    @Override
    public void onTriggerEvent(TriggerStateChangeEvent event) {
        // TODO Auto-generated method stub
    }

    @Override
    public void onFailureEvent(BarcodeFailureEvent arg0) {
        // TODO Auto-generated method stub
    }

    @Override
    public void onResume() {
        super.onResume();
        mResume = true;
        if (mBarcodeReader != null) {
            try {
                mBarcodeReader.claim();
            } catch (ScannerUnavailableException e) {
//                e.printStackTrace();
                Toast.makeText(this, "Scanner unavailable", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        mResume = false;
        if (mBarcodeReader != null) {
            // release the scanner claim so we don't get any scanner
            // notifications while paused.
            mBarcodeReader.release();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (mBarcodeReader != null) {
            // unregister barcode event listener
            mBarcodeReader.removeBarcodeListener(this);
            // unregister trigger state change listener
            mBarcodeReader.removeTriggerListener(this);
            mBarcodeReader.close();
        }
        if (mAidcManager != null) {
            mAidcManager.close();
        }
    }

    public void claimBarcodeReader() {
        if (mBarcodeReader != null) {
            try {
                mBarcodeReader.claim();
            } catch (ScannerUnavailableException e) {
//                e.printStackTrace();
                Toast.makeText(this, "Scanner unavailable", Toast.LENGTH_SHORT).show();
            }
        }
    }

    private void scannerSelection(final List<BarcodeReaderInfo> scanners) {
        Handler h = new Handler(Looper.getMainLooper());
        h.post(new Runnable() {
            @Override
            public void run() {
                final Dialog scannerSelectDialog = new Dialog(mContext);
                scannerSelectDialog.setContentView(R.layout.scanner_select_dialog);
                Button dialogButton = (Button) scannerSelectDialog
                        .findViewById(R.id.dialogButtonOK);

                // If there are scanners, just show the list, must select one
                if (scanners.size() > 0) {
                    scannerSelectDialog.setTitle("Select Scanner");
                    dialogButton.setVisibility(Button.INVISIBLE);
                    final Map<String, String> scannerNames = new HashMap<String, String>();
                    for (BarcodeReaderInfo i : scanners) {
                        scannerNames.put(i.getFriendlyName(), i.getName());
                    }

                    final ListView list = (ListView) scannerSelectDialog
                            .findViewById(R.id.listScanners);
                    ArrayAdapter<String> scannerNameAdapter = new ArrayAdapter<String>(mContext,
                            android.R.layout.simple_list_item_1, android.R.id.text1,
                            new ArrayList<String>(scannerNames.keySet()));
                    list.setAdapter(scannerNameAdapter);

                    list.setOnItemClickListener(new OnItemClickListener() {
                        @Override
                        public void onItemClick(AdapterView<?> myAdapter, View myView, int pos,
                                long mylng) {
                            String selectedScanner = (String) list.getItemAtPosition(pos);
                            createBarcodeReaderConnection(scannerNames.get(selectedScanner));
                            scannerSelectDialog.dismiss();
                        }

                    });

                } else { // Show an ok button to close dialog
                    scannerSelectDialog.setTitle("No Scanners Connected");
                    dialogButton.setOnClickListener(new OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            scannerSelectDialog.dismiss();
                        }
                    });
                }

                scannerSelectDialog.setCancelable(false);
                scannerSelectDialog.show();
            }
        });
    }

    private void createBarcodeReaderConnection(String scanner) {
        if (scanner != null && !scanner.equals(mConnectedScanner)) {

            if (mBarcodeReader != null) {
                mBarcodeReader.release();
                mBarcodeReader.close();
            }

            try {
                mBarcodeReader = mAidcManager.createBarcodeReader(scanner);
               mBarcodeReader.setProperty(BarcodeReader.PROPERTY_TRIGGER_CONTROL_MODE,
                      BarcodeReader.TRIGGER_CONTROL_MODE_AUTO_CONTROL);

            } catch (UnsupportedPropertyException e) {
//                e.printStackTrace();
                Toast.makeText(this, "Control mode not set", Toast.LENGTH_SHORT).show();
            }
            catch (InvalidScannerNameException e) {
//                e.printStackTrace();
                Toast.makeText(this, "Invalid Scanner Name Exception: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }
            catch (Exception e){
//                e.printStackTrace();
                Toast.makeText(this, "Exception: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            }

            mBarcodeReader.addBarcodeListener((BarcodeReader.BarcodeListener) mContext);
            mBarcodeReader.addTriggerListener((BarcodeReader.TriggerListener) mContext);
			mBarcodeReader.addMenuCommandListener((BarcodeReader.MenuCommandListener) mContext);

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
            // Sets time period for decoder timeout in any mode
            properties.put(BarcodeReader.PROPERTY_DECODER_TIMEOUT,  400);
            // Apply the settings
            mBarcodeReader.setProperties(properties);

            claimBarcodeReader();
            mConnectedScanner = scanner;
        }
    }
}
