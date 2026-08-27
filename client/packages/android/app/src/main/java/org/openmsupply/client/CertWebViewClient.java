package org.openmsupply.client;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import androidx.annotation.Nullable;

import com.getcapacitor.Bridge;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.security.MessageDigest;
import java.security.cert.Certificate;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.List;
import java.util.Objects;

class CertWebViewClient extends ExtendedWebViewClient {
    public static final String TAG = "CertWebViewClient";
    NativeApi nativeApi;
    File filesDir;
    @Nullable
    Certificate selfSignedCert;
    private final SharedPreferences savedCertFingerprints;

    public CertWebViewClient(Bridge bridge, File filesDir, NativeApi nativeApi) {
        super(bridge);

        savedCertFingerprints = bridge.getContext().getSharedPreferences("savedCertFingerprints", Context.MODE_PRIVATE);
        this.nativeApi = nativeApi;
        this.filesDir = filesDir;
    }

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
            return (X509Certificate) cert;
        } catch (CertificateException e) {
            return null;
        }
    }

    /**
     * In this scenario, the server runs on the same device and we have direct
     * access to the server's public key.
     * It needs be validated that we indeed connecting to the local server by
     * validating the locally stored certificate.
     */
    private boolean validateLocalCertificate(SslCertificate targetCert) {
        // If there is a ssl error, check if the request was trying to reach our local
        // trusted
        // remote server. For this:
        // 1) load self signed remote server certificate from local storage
        // 2) validate that the request was trying to reach the server by validating
        // that the
        // target certificate from the request is matching our known self signed
        // certificate
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

    /**
     * In this scenario, we are connecting to a non-local server with uses a
     * self-signed certificate.
     * It needs to be checked that we know/trust the server before performing the
     * certificate validation.
     */
    private boolean validateNonLocalCertificate(SslCertificate targetCert, NativeApi.FrontEndHost connectedServer) {
        // Calculate SSL fingerprint
        MessageDigest md = null;
        try {
            md = MessageDigest.getInstance("SHA-256");
            md.update(get_x509(targetCert).getEncoded());
        } catch (Exception e) {
            Log.e(TAG, "Problem hashing certificate" + e);
            return false;
        }
        String fingerprint = Base64.encodeToString(md.digest(), Base64.DEFAULT).trim();

        // Match SSL fingerprint for server stored in app data
        // Match by hardware id and port
        String identifier = connectedServer.getHardwareId() + "-" + connectedServer.getPort();
        String savedCertFingerprint = savedCertFingerprints.getString(identifier, "");
        // Save if fingerprint was not found for server
        if (savedCertFingerprint.length() == 0) {
            SharedPreferences.Editor editor = savedCertFingerprints.edit();
            editor.putString(identifier, fingerprint);
            editor.apply();
            return true;
        }

        return savedCertFingerprint.equals(fingerprint);
    }

    @SuppressLint("WebViewClientOnReceivedSslError")
    @Override
    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {

        // We are only handling self signed certificate errors (untrusted)
        if (error.getPrimaryError() != SslError.SSL_UNTRUSTED) {
            super.onReceivedSslError(view, handler, error);
            return;
        }

        // Ignore SSL checks in debug mode
        if (nativeApi.getIsDebug()) {
            handler.proceed();
            return;
        }

        String url = error.getUrl();
        Boolean isDiscovery = url.startsWith(nativeApi.getLocalUrl());
        NativeApi.FrontEndHost connectedServer = nativeApi.getConnectedServer();
        Boolean isConnectedToServer = connectedServer != null && url.startsWith(connectedServer.getUrl());

        // Default behaviour if not connected to a server or not discovery
        if (!(isConnectedToServer || isDiscovery)) {
            super.onReceivedSslError(view, handler, error);
            return;
        }

        // Local certificate check for local server connections
        Boolean valid = isDiscovery || connectedServer.isLocal() ? validateLocalCertificate(error.getCertificate())
                : validateNonLocalCertificate(error.getCertificate(), connectedServer);

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


    // reloading a page ( javascript: navigate(0) or window.location.reload() )
    // will not only reload, but will open the URL in a browser tab
    // for local URLs we don't want this to happen!
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        // define top level URL paths which should not be opened in the current WebView
        String[] externalPaths = {"sync_files"};
        Uri url = request.getUrl();
        try {
            if (url.toString().startsWith(nativeApi.getServerUrl())) {
                List<String> segments = url.getPathSegments();
                if (segments.size() == 0) return false;
                String firstSegment = segments.get(0);

                for (String path: externalPaths) {
                    if (Objects.equals(firstSegment, path)) {
                        Intent intent = new Intent(Intent.ACTION_VIEW);
                        intent.setDataAndNormalize(url);
                        intent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        bridge.getActivity().startActivity(intent);
                        return true;
                    }
                }
                return false;
            }
        }
        catch(Exception e){
            Log.e(TAG,e.getMessage());
        }
        return bridge.launchIntent(url);
    }
}