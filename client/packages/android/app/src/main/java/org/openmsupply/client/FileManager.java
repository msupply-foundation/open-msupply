package org.openmsupply.client;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

import java.io.BufferedWriter;
import java.io.OutputStream;
import java.io.OutputStreamWriter;

public class FileManager {
    private static final int SAVE_FILE_REQUEST = 12321;
    private Activity activity;
    private String content;

    public FileManager(Activity activity) {
        this.activity = activity;
    }

    public void Save(String filename, String content) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        // This was a neat idea, but only works with small amounts of text!
        // With a few hundred KB the file chooser closes immediately on open
        // intent.putExtra(Intent.EXTRA_TEXT, content);
        this.content = content;

        activity.startActivityForResult(intent, SAVE_FILE_REQUEST);
    }

    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == SAVE_FILE_REQUEST && resultCode == Activity.RESULT_OK && data != null) {
            Uri uri = data.getData();
            Context context = activity.getApplicationContext();

            try {
                OutputStream outputStream = context.getContentResolver().openOutputStream(uri);
                BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(outputStream));
                bw.write(content);
                bw.flush();
                bw.close();
            } catch (Exception e) {
                Toast.makeText(context, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }
}
