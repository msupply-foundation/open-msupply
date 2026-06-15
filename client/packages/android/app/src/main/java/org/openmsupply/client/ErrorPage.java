package org.openmsupply.client;

import android.app.AlertDialog;
import android.content.Context;
import android.graphics.Typeface;
import android.webkit.JavascriptInterface;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

/**
 * JavaScript bridge for the inline error page shown when the readiness poll
 * gives up. The actual HTML lives at {@link #URL} (assets/native/error_page.html).
 */
public class ErrorPage {
    public static final String URL = "file:///android_asset/native/error_page.html";
    private static final String LOG_FILE_NAME = "remote_server.log";

    private final Context mContext;
    private final String mFailedUrl;

    ErrorPage(Context c, String failedUrl) {
        mContext = c;
        mFailedUrl = failedUrl;
    }

    /** Returned to the page's JS so it can render the URL the WebView failed to reach. */
    @JavascriptInterface
    public String getFailedUrl() {
        return mFailedUrl != null ? mFailedUrl : "";
    }

    @JavascriptInterface
    public void showLogs() {
        try {
            File file = new File(mContext.getFilesDir(), LOG_FILE_NAME);
            if (!file.exists()) {
                Toast.makeText(mContext, "Log file does not exist yet", Toast.LENGTH_SHORT).show();
                return;
            }
            BufferedReader br = new BufferedReader(new FileReader(file));
            StringBuilder sb = new StringBuilder();
            String line;

            while ((line = br.readLine()) != null) {
                sb.append(line);
                sb.append("\n");
            }
            br.close();

            ScrollView scrollView = new ScrollView(mContext);
            TextView textView = new TextView(mContext);
            textView.setText(sb);
            textView.setPadding(20, 20, 20, 20);
            textView.setTextSize(12);
            textView.setTypeface(Typeface.MONOSPACE);
            scrollView.addView(textView);

            new AlertDialog.Builder(mContext)
                    .setView(scrollView)
                    .setTitle("Log File")
                    .setPositiveButton("Close", null)
                    .show();
        } catch (IOException e) {
            Toast.makeText(mContext, "Error: Unable to read log file!", Toast.LENGTH_SHORT).show();
        }
    }
}
