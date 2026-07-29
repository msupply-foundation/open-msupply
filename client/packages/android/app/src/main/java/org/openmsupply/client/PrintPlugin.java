package org.openmsupply.client;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Printing via the OS print service (Android PrintManager). The print
 * counterpart to SaveFilePlugin.
 *
 * Used by the NEW front end (open-msupply-frontend), whose JS side is
 * src/platform/openDocument.ts `printBlob` — it creates the proxy with
 * registerPlugin('Print').
 *
 * Android needs this because neither of the alternatives exists on a tablet:
 * the WebView has no window.print, and the server renders PDFs by driving
 * headless Chrome, which has no executable to launch on Android. So the
 * finished HTML goes to the OS instead.
 *
 * printHtml({ html, jobName }) resolves once the document has been handed to
 * the print service — the print dialog itself is the user's business, and
 * their cancelling it is not an error. Rejects only if the job can't be
 * started.
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    /**
     * The WebView rendering the current job. Held as a field because
     * PrintManager reads the document from it asynchronously, after this
     * method returns — a local would be eligible for garbage collection
     * mid-job, and the print would silently produce nothing.
     */
    private WebView printView;

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        if (html == null) {
            call.reject("html is required");
            return;
        }
        String jobName = call.getString("jobName", "Document");

        // WebViews must be created and driven on the UI thread.
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = new WebView(getActivity());
                webView.setWebViewClient(new WebViewClient() {
                    private boolean printed = false;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        // onPageFinished can fire more than once for one load.
                        if (printed) return;
                        printed = true;

                        PrintManager printManager =
                            (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                        if (printManager == null) {
                            printView = null;
                            call.reject("No print service on this device");
                            return;
                        }

                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                        printManager.print(
                            jobName,
                            adapter,
                            new PrintAttributes.Builder().build()
                        );
                        call.resolve();
                    }
                });

                // No base URL: report documents carry their styles inline and
                // their images as data: URIs, so nothing needs resolving
                // against an origin.
                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
                printView = webView;
            } catch (Exception e) {
                printView = null;
                call.reject("Failed to start print job: " + e.getMessage(), e);
            }
        });
    }
}
