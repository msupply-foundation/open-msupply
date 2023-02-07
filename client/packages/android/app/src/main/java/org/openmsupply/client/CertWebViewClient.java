package org.openmsupply.client;

import com.getcapacitor.Bridge;
import com.getcapacitor.JSObject;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

class CertWebViewClient extends ExtendedWebViewClient {
    public static final String TAG = "CertWebViewClient";
    private SharedPreferences savedCertFingerprints;
    NativeApi nativeApi;
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

    public CertWebViewClient(Bridge bridge, File filesDir, NativeApi nativeApi) {
        super(bridge);

        savedCertFingerprints = bridge.getContext().getSharedPreferences("savedCertFingerprints", Context.MODE_PRIVATE);
        this.nativeApi = nativeApi;
        this.filesDir = filesDir;
    }

    private boolean validateLocalCertificate(SslCertificate targetCert) {
        // If there is a ssl error, check if the request was trying to reach our local trusted
        // remote server. For this:
        // 1) load self signed remote server certificate from local storage
        // 2) validate that the request was trying to reach the server by validating that the
        //    target certificate from the request is matching our known self signed certificate
        Certificate selfSignedCert = this.get_self_signed_cert();
        if (selfSignedCert == null || targetCert == null) {
            return false;
        }
        Certificate targetX509Cert = get_x509(targetCert);
        if (targetX509Cert == null) {
            Log.e(TAG, "Failed to extract x509 request target certificate");
            return false;
        }

        try {
            targetX509Cert.verify(selfSignedCert.getPublicKey());
            return true;
        } catch (Exception e) {
            Log.e(TAG, "Invalid request target certificate" + e);
        }

        return false;
    }

    private boolean validateNonLocalCertificate(SslCertificate targetCert, NativeApi.omSupplyServer connectedServer) {
        // Calculate SSL fingerprint
        PublicKey publicKey = get_x509(targetCert).getPublicKey();
        MessageDigest md = null;
        try {
           md = MessageDigest.getInstance("SHA-256");
        } catch (Exception e) {
            Log.e(TAG, "SHA-256 algorithm is missing" + e);
            return false;
        }
        md.update(publicKey.getEncoded());
        String fingerprint = Base64.encodeToString(md.digest(), Base64.DEFAULT).trim();

        // Match SSL fingerprint for server stored in app data
        // Match by hardware id and port
        String identifier = connectedServer.getHardwareId() + "-" + connectedServer.getPort();
        String savedCertFingerprint = savedCertFingerprints.getString(identifier, "");
        // Save if fingerprint was not found for server
        if(savedCertFingerprint.length() == 0) {
            SharedPreferences.Editor editor = savedCertFingerprints.edit();
            editor.putString(identifier, fingerprint);
            editor.apply();
            return true;
        }

        return savedCertFingerprint.equals(fingerprint);
    }

    @SuppressLint("WebViewClientOnReceivedSslError")
    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler,
                                   SslError error) {
        // Ignore SSL checks in debug mode
        if(nativeApi.getIsDebug()) {
            handler.proceed();
            return;
        }

        String url = error.getUrl();
        Boolean isDiscovery = url.startsWith(nativeApi.getLocalUrl());
        NativeApi.omSupplyServer connectedServer = nativeApi.getConnectedServer();
        Boolean isConnectedToServer = connectedServer != null && url.startsWith(connectedServer.getUrl());

        // Default behaviour if not connected to a server or not discovery
        if(!(isConnectedToServer || isDiscovery)) {
            super.onReceivedSslError(view, handler, error);
            return;
        }

        // Local certificate check for local server connections
        Boolean valid = isDiscovery || connectedServer.isLocal() ? validateLocalCertificate(error.getCertificate()) : validateNonLocalCertificate(error.getCertificate(), connectedServer);

        if (valid) {
            handler.proceed();
            return;
        } else {
            // Display error message
            new AlertDialog.Builder(this.bridge.getContext())
                    .setTitle("SSL Error")
                    .setMessage("Certificate fingerprint for server was changed")
                    .setNegativeButton("OK", null)
                    .setIcon(android.R.drawable.ic_dialog_alert)
                    .show();

            super.onReceivedSslError(view, handler, error);
        }
    }
}