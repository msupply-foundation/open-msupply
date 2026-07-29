package org.openmsupply.client;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

/**
 * "Save as" via the OS document picker (SAF ACTION_CREATE_DOCUMENT): the user
 * chooses the destination (Downloads, Drive, SD card), we write the bytes to
 * the returned URI.
 *
 * Used by the NEW front end (open-msupply-frontend), whose JS side is
 * src/platform/openDocument.ts `saveBlob` — it creates the proxy with
 * registerPlugin('SaveFile'). The old UI keeps using NativeApi.saveFile /
 * FileManager instead; this is the same capability expressed as a plain
 * Capacitor plugin, not a replacement for it.
 *
 * save({ data: base64, fileName, mimeType }) resolves { saved: true } once
 * written, or { saved: false } when the user cancels the picker (not an
 * error); rejects only on a real write failure.
 */
@CapacitorPlugin(name = "SaveFile")
public class SaveFilePlugin extends Plugin {

    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data (base64) is required");
            return;
        }
        String fileName = call.getString("fileName", "file");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, fileName);

        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        Intent data = result.getData();
        Uri uri = data == null ? null : data.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            JSObject ret = new JSObject();
            ret.put("saved", false);
            call.resolve(ret);
            return;
        }

        try {
            byte[] bytes = Base64.decode(call.getString("data"), Base64.DEFAULT);
            try (OutputStream out = getActivity().getContentResolver().openOutputStream(uri)) {
                out.write(bytes);
            }
            JSObject ret = new JSObject();
            ret.put("saved", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to write file: " + e.getMessage(), e);
        }
    }
}
