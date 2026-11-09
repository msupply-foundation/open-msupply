package org.openmsupply.client;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.honeywell.aidc.AidcManager;
import com.honeywell.aidc.BarcodeFailureEvent;
import com.honeywell.aidc.BarcodeReadEvent;
import com.honeywell.aidc.BarcodeReader;
import com.honeywell.aidc.InvalidScannerNameException;
import com.honeywell.aidc.ScannerUnavailableException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The built-in laser scanner on Honeywell devices (CK65), over Honeywell's
 * AIDC SDK (libs/HoneywellScanner.aar; client/packages/android/HONEYWELL_SCANNER.md).
 *
 * Shared by both Android shells (../../../../README.md), and so called by both
 * front ends. Two surfaces, one scanner:
 *
 *  - CURRENT, for the new front end (src/platform/barcodeSources/honeywell.ts):
 *    status() / arm() / trigger(), with every read delivered as a "scan"
 *    event and every no-read as a "failure" event. Who receives a scan is the
 *    front end's decision (addListener/remove), not this class's.
 *  - LEGACY, for the old front end (client/packages/common/src/hooks/
 *    useHoneywellScanner): listen() / release() / available(), unchanged in
 *    shape. An APK connects to servers of other versions, so an old front end
 *    can be served into this shell for as long as those servers exist. Delete
 *    these when no supported server serves the old front end.
 *
 * The CLAIM follows the app, not the page: claimed once the reader exists and
 * on every resume, released on every pause (Honeywell's own recommended
 * lifecycle). While claimed, the device's keyboard-wedge output is suppressed,
 * so a scan made where nothing is listening is dropped rather than typed into
 * whatever field has focus. Another app gets the scanner back as soon as this
 * one leaves the foreground.
 */
@CapacitorPlugin(name = "HoneywellScanner")
public class HoneywellScannerPlugin extends Plugin implements BarcodeReader.BarcodeListener {
    private static final String TAG = "HoneywellScanner";

    /**
     * Bumped when the current surface changes shape, so the front end can
     * tell what this shell supports. An APK without status() rejects the call
     * outright, which the front end reads as "no current surface".
     */
    private static final int API_VERSION = 1;

    /** How long the software trigger holds the beam on when not told otherwise. */
    private static final int DEFAULT_TRIGGER_TIMEOUT_MS = 5000;

    /**
     * The SDK's startup is asynchronous and gives no failure callback, so an
     * answer is due by this long after load even if it never finishes.
     */
    private static final int READY_TIMEOUT_MS = 5000;

    private enum Readiness { STARTING, READY, UNAVAILABLE }

    private final Handler main = new Handler(Looper.getMainLooper());

    // Guarded by `this`: the SDK calls back on its own thread.
    private Readiness readiness = Readiness.STARTING;
    private final List<PluginCall> awaitingReady = new ArrayList<>();
    private AidcManager manager;
    private BarcodeReader barcodeReader;
    private boolean claimed = false;
    /** The old front end released the scanner; don't reclaim it behind its back. */
    private boolean legacyReleased = false;
    private PluginCall legacyListenCall;
    /** Whether trigger() left the trigger pressed. */
    private boolean softwareTriggered = false;

    private final Runnable triggerTimeout = () -> setTrigger(false);

    @Override
    public void load() {
        super.load();

        // Only Honeywell devices run the scanner service. Elsewhere
        // AidcManager.create binds to nothing and never calls back, so asking
        // at all would just mean every status() waiting out READY_TIMEOUT_MS
        // on every tablet in the fleet.
        if (!isHoneywellDevice()) {
            settle(Readiness.UNAVAILABLE);
            return;
        }

        main.postDelayed(() -> {
            synchronized (this) {
                if (readiness == Readiness.STARTING) {
                    Log.w(TAG, "Scanner service did not start in time");
                    settle(Readiness.UNAVAILABLE);
                }
            }
        }, READY_TIMEOUT_MS);

        AidcManager.create(getContext().getApplicationContext(), aidcManager -> {
            synchronized (this) {
                manager = aidcManager;
                try {
                    barcodeReader = manager.createBarcodeReader();
                } catch (InvalidScannerNameException e) {
                    Log.e(TAG, "Invalid scanner name", e);
                }
                if (barcodeReader == null) {
                    settle(Readiness.UNAVAILABLE);
                    return;
                }
                configureBarcodeReader();
                barcodeReader.addBarcodeListener(this);
                // A late start still counts: a status() after the timeout
                // gets the true answer.
                settle(Readiness.READY);
                claim();
            }
        });
    }

    private static boolean isHoneywellDevice() {
        String manufacturer = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase();
        // Intermec was Honeywell's; its devices run the same service.
        return manufacturer.contains("honeywell") || manufacturer.contains("intermec");
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

        // No Code 39 length cap. The previous 10-character cap came from
        // Honeywell's sample code, and "codes exceeding the maximum length
        // will not be decoded" — a longer label simply never scanned.

        // Turn on center decoding
        // (sic — it is set OFF, and always has been; the comment came from
        // Honeywell's sample code along with the Code 39 cap above.)
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

    // --- Readiness ----------------------------------------------------------

    private synchronized void settle(Readiness next) {
        readiness = next;
        for (PluginCall call : awaitingReady) {
            answerWhenReady(call);
        }
        awaitingReady.clear();
    }

    /** Answer `call` now if startup has finished, or once it does. */
    private synchronized void whenReady(PluginCall call) {
        if (readiness == Readiness.STARTING) {
            // Held here, not kept alive by the bridge: it resolves once.
            awaitingReady.add(call);
        } else {
            answerWhenReady(call);
        }
    }

    private void answerWhenReady(PluginCall call) {
        String method = call.getMethodName();
        if ("available".equals(method)) {
            JSObject result = new JSObject();
            result.put("available", readiness == Readiness.READY);
            call.resolve(result);
        } else {
            call.resolve(statusObject());
        }
    }

    private synchronized JSObject statusObject() {
        JSObject result = new JSObject();
        result.put("apiVersion", API_VERSION);
        result.put("available", readiness == Readiness.READY);
        result.put("claimed", claimed);
        return result;
    }

    // --- Claim --------------------------------------------------------------

    /** Claim if not already held. Returns an error message, or null on success. */
    private synchronized String claim() {
        if (barcodeReader == null) return "Scanner not available";
        if (claimed) return null;
        try {
            barcodeReader.claim();
            claimed = true;
            Log.i(TAG, "Scanner claimed");
            return null;
        } catch (ScannerUnavailableException e) {
            // Another app holds it, typically.
            Log.e(TAG, "Scanner unavailable", e);
            return "Scanner unavailable";
        }
    }

    private synchronized void releaseClaim() {
        main.removeCallbacks(triggerTimeout);
        if (barcodeReader == null || !claimed) return;
        try {
            barcodeReader.softwareTrigger(false);
        } catch (Exception e) {
            // Not triggered, or already gone — nothing to stop.
        }
        softwareTriggered = false;
        barcodeReader.release();
        claimed = false;
        Log.i(TAG, "Scanner released");
    }

    private synchronized void setTrigger(boolean on) {
        main.removeCallbacks(triggerTimeout);
        if (barcodeReader == null || !claimed) return;
        try {
            barcodeReader.softwareTrigger(on);
            softwareTriggered = on;
        } catch (Exception e) {
            Log.e(TAG, "Software trigger failed", e);
        }
    }

    /**
     * A read (or no-read) ends a software press. Let go explicitly: left
     * "down", the next trigger() would press a trigger already pressed and
     * start nothing. Posted, because this runs on the SDK's callback thread.
     */
    private void endSoftwarePress() {
        main.removeCallbacks(triggerTimeout);
        boolean pressed;
        synchronized (this) {
            pressed = softwareTriggered;
        }
        if (pressed) main.post(() -> setTrigger(false));
    }

    // --- Current surface ----------------------------------------------------

    /**
     * { apiVersion, available, claimed }. Waits for the SDK to finish
     * starting, so an early caller gets the real answer rather than "not
     * yet" read as "no".
     */
    @PluginMethod
    public void status(PluginCall call) {
        whenReady(call);
    }

    /**
     * Make sure the scanner is claimed — the app normally holds it already;
     * this reclaims it if another app took it. Rejects with the reason when
     * it cannot be claimed.
     */
    @PluginMethod
    public void arm(PluginCall call) {
        synchronized (this) {
            legacyReleased = false;
        }
        String error = claim();
        if (error != null) call.reject(error);
        else call.resolve();
    }

    /**
     * Press ({ on: true }) or let go of ({ on: false }) the trigger from
     * software. A press lets go by itself after `timeoutMs` (default 5 s);
     * a read ends it sooner. No read by then arrives as a "failure" event.
     */
    @PluginMethod
    public void trigger(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", true));
        int timeoutMs = call.getInt("timeoutMs", DEFAULT_TRIGGER_TIMEOUT_MS);
        if (on) {
            String error = claim();
            if (error != null) {
                call.reject(error);
                return;
            }
        }
        setTrigger(on);
        if (on) main.postDelayed(triggerTimeout, timeoutMs);
        call.resolve();
    }

    // --- Legacy surface (old front end) -------------------------------------

    /**
     * A keep-alive callback resolved with { barcode } per read and rejected
     * with "Scan has failed" per no-read — the shape the old front end's
     * useHoneywellScanner hook expects.
     */
    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void listen(PluginCall call) {
        synchronized (this) {
            legacyReleased = false;
        }
        String error = claim();
        if (error != null) {
            call.reject(error);
            return;
        }
        synchronized (this) {
            // One listener: a second listen() replaces the first, and the
            // first's callback is released rather than leaked.
            if (legacyListenCall != null && legacyListenCall != call) {
                legacyListenCall.release(getBridge());
            }
            call.setKeepAlive(true);
            legacyListenCall = call;
        }
        Log.i(TAG, "Listening for scans (legacy)");
    }

    /**
     * Stop listening and let go of the scanner, as the old front end expects
     * — so the device's keyboard wedge types again until it next listens.
     */
    @PluginMethod
    public void release(PluginCall call) {
        synchronized (this) {
            if (legacyListenCall != null) {
                legacyListenCall.release(getBridge());
                legacyListenCall = null;
            }
            legacyReleased = true;
        }
        releaseClaim();
        call.resolve();
    }

    /** { available }. Waits for startup, like status(). */
    @PluginMethod
    public void available(PluginCall call) {
        whenReady(call);
    }

    // --- Reads ----------------------------------------------------------------

    @Override
    public void onBarcodeEvent(BarcodeReadEvent event) {
        endSoftwarePress();
        String data = event.getBarcodeData();

        JSObject scan = new JSObject();
        scan.put("data", data);
        // The symbology, which the text alone cannot tell you: "]C1" is
        // GS1-128 where "]C0" is plain Code 128, "]d2" GS1 DataMatrix.
        scan.put("aimId", event.getAimId());
        scan.put("codeId", event.getCodeId());
        notifyListeners("scan", scan);

        PluginCall legacy;
        synchronized (this) {
            legacy = legacyListenCall;
        }
        if (legacy != null) {
            JSObject result = new JSObject();
            result.put("barcode", data);
            result.put("type", "scan");
            legacy.resolve(result);
        }
    }

    @Override
    public void onFailureEvent(BarcodeFailureEvent event) {
        // Mostly a trigger released with nothing in the beam — routine.
        endSoftwarePress();
        notifyListeners("failure", new JSObject());

        PluginCall legacy;
        synchronized (this) {
            legacy = legacyListenCall;
        }
        if (legacy != null) legacy.reject("Scan has failed");
    }

    // --- App lifecycle --------------------------------------------------------

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        boolean reclaim;
        synchronized (this) {
            reclaim = !legacyReleased;
        }
        if (reclaim) claim();
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        releaseClaim();
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        main.removeCallbacksAndMessages(null);
        synchronized (this) {
            if (barcodeReader != null) {
                barcodeReader.removeBarcodeListener(this);
                barcodeReader.close();
                barcodeReader = null;
            }
            claimed = false;
            if (manager != null) {
                manager.close();
                manager = null;
            }
        }
    }
}
