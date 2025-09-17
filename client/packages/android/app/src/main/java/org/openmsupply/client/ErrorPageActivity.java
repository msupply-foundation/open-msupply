package org.openmsupply.client;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class ErrorPageActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new ErrorPage(this), "ErrorPageInject");
        webView.loadData(ErrorPage.encodedHtml, "text/html", "base64");
        setContentView(webView);
    }
}
