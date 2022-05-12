package org.openmsupply.client.certplugin;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;

import android.annotation.SuppressLint;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

class CertWebViewClient extends BridgeWebViewClient {
    public static final String TAG = "CertWebViewClient";

    File filesDir;
    @Nullable
    Certificate selfSignedCert;

    private Certificate get_self_signed_cert() {
        if (this.selfSignedCert != null) {
            return this.selfSignedCert;
        }
        final File certFile = new File(this.filesDir, "certs/cert.pem");
        try {
            final CertificateFactory cf = CertificateFactory.getInstance("X.509");
            this.selfSignedCert = cf.generateCertificate(new BufferedInputStream(
                    new FileInputStream(certFile)));
        } catch (CertificateException | FileNotFoundException e) {
            Log.e(TAG, "Failed to load self signed certificate" + e);
            return null;
        }
        return this.selfSignedCert;
    }

    // https://stackoverflow.com/questions/20228800/how-do-i-validate-an-android-net-http-sslcertificate-with-an-x509trustmanager
    private X509Certificate get_x509(SslCertificate certificate) {
        Bundle bundle = SslCertificate.saveState(certificate);
        byte[] bytes = bundle.getByteArray("x509-certificate");
        if (bytes == null) {
            return null;
        }
        try {
            CertificateFactory certFactory = CertificateFactory.getInstance("X.509");
            Certificate cert = certFactory.generateCertificate(new ByteArrayInputStream(bytes));
            return  (X509Certificate)cert;
        } catch (CertificateException e) {
            return null;
        }
    }

    public CertWebViewClient(Bridge bridge, File filesDir) {
        super(bridge);

        this.filesDir = filesDir;
    }

    @SuppressLint("WebViewClientOnReceivedSslError")
    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler,
                                   SslError error) {
        // If there is a ssl error, check if the request was trying to reach our local trusted
        // remote server. For this:
        // 1) load self signed remote server certificate from local storage
        // 2) validate that the request was trying to reach the server by validating that the
        //    target certificate from the request is matching our known self signed certificate
        Certificate selfSignedCert = this.get_self_signed_cert();
        SslCertificate targetCert = error.getCertificate();
        if (selfSignedCert == null || targetCert == null) {
            super.onReceivedSslError(view, handler, error);
            return;
        }
        Certificate targetX509Cert = get_x509(targetCert);
        if (targetX509Cert == null) {
            Log.e(TAG, "Failed to extract x509 request target certificate");
            super.onReceivedSslError(view, handler, error);
            return;
        }

        try {
            targetX509Cert.verify(selfSignedCert.getPublicKey());
            handler.proceed();
            return;
        } catch (Exception e) {
            Log.e(TAG, "Invalid request target certificate" + e);
        }

        super.onReceivedSslError(view, handler, error);
    }
}

/**
 * Swaps out the web view client with a version that allows requests to the local remote-server.
 */
@CapacitorPlugin(name = "CertPlugin")
public class CertPlugin extends Plugin {
    @Override
    public void load() {
        CertWebViewClient client = new CertWebViewClient(this.getBridge(), this.getContext().getFilesDir());
        bridge.setWebViewClient(client);
    }
}
