package org.openmsupply.client;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

import java.io.BufferedWriter;
import java.io.InputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.File;
import java.io.FileInputStream;

public class FileManager {
    private static final int SAVE_FILE_REQUEST = 12321;
    private static final int SAVE_DATABASE_REQUEST = 12322;
    private Activity activity;
    private String content;
    private File dbFile;

    public FileManager(Activity activity) {
        this.activity = activity;
    }

    public void SaveDatabase(File file) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/x-sqlite3");
        intent.putExtra(Intent.EXTRA_TITLE, "openmsupply.sqlite");
        activity.startActivityForResult(intent, SAVE_DATABASE_REQUEST);

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

        if (requestCode == SAVE_DATABASE_REQUEST && resultCode == Activity.RESULT_OK && data != null
                && dbFile != null) {
            Uri uri = data.getData();
            Context context = activity.getApplicationContext();

            InputStream inputStream = null;
            OutputStream outputStream = null;

            try {
                inputStream = new FileInputStream(dbFile);
                outputStream = context.getContentResolver().openOutputStream(uri);

                byte[] buffer = new byte[1024];
                int length;
                while ((length = inputStream.read(buffer)) > 0) {
                    outputStream.write(buffer, 0, length);
                }
            } catch (Exception e) {
                Toast.makeText(context, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
            } finally {
                if (inputStream != null) {
                    try {
                        inputStream.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
                if (outputStream != null) {
                    try {
                        outputStream.close();
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
}
