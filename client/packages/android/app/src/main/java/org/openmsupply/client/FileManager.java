package org.openmsupply.client;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import java.io.BufferedWriter;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.OutputStream;
import java.io.OutputStreamWriter;


public class FileManager extends AppCompatActivity {
    private static final int SAVE_FILE_REQUEST = 12321;
    Context context;
    public FileManager(Context context) {
        this.context = context;
    }

   @Override
   public void onActivityResult(int requestCode, int resultCode, Intent data) {
       super.onActivityResult(requestCode, resultCode, data);
       if(requestCode == SAVE_FILE_REQUEST && resultCode == Activity.RESULT_OK && data != null) {
           Uri uri = data.getData();

           try {
               OutputStream outputStream = getContentResolver().openOutputStream(uri);
               String content = data.getStringExtra(Intent.EXTRA_TEXT);

               BufferedWriter bw = new BufferedWriter(new OutputStreamWriter(outputStream));
               bw.write("some other test data");
               bw.write(content);
               bw.flush();
               bw.close();
           }
           catch(Exception e) {
                Toast.makeText(context, "Error: "+e.getMessage(), Toast.LENGTH_LONG).show();
           }
       }
   }

    public void Save(String filename, String content) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        intent.putExtra(Intent.EXTRA_TEXT, content);
        // saveFileDialogLauncher.launch(intent);
        ((Activity )context).startActivityForResult(intent, SAVE_FILE_REQUEST);
    }

        ActivityResultLauncher<Intent> saveFileDialogLauncher = registerForActivityResult(
                new ActivityResultContracts.StartActivityForResult(),
                result -> {
                    if (result.getResultCode() == Activity.RESULT_OK) {
                        Intent data = result.getData();
                        Uri uri = data.getData();

                        try {
                            OutputStream output = getContentResolver().openOutputStream(uri);
                            String content = data.getStringExtra(Intent.EXTRA_TEXT);

                            output.write(content.getBytes());
                            output.flush();
                            output.close();
                        } catch (FileNotFoundException e) {
//                throw new RuntimeException(e);
                        }
                        catch(IOException e) {
//                Toast.makeText(context, "Error", Toast.LENGTH_SHORT).show();
                        }
                        catch(Exception e) {

                        }                    }
                });
}
