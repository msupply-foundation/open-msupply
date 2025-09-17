package org.openmsupply.client;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

public class SplashActivity extends Activity {
    private static final long TIMEOUT_MS = 60_000; // 1 minute
    private Handler handler = new Handler(Looper.getMainLooper());
    private boolean finished = false;

    private final Runnable timeoutRunnable = new Runnable() {
        @Override
        public void run() {
            if (!finished) {
                // Timeout reached, show error page
                Intent intent = new Intent(SplashActivity.this, ErrorPageActivity.class);
                startActivity(intent);
                finish();
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setTheme(R.style.AppTheme_NoActionBarLaunch);

        if (AppState.getInstance().isServerReady()) {
            launchMain();
        } else {
            // Wait for server to be ready, or timeout
            handler.postDelayed(timeoutRunnable, TIMEOUT_MS);
            checkServerReadyLoop();
        }
    }

    private void checkServerReadyLoop() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (finished) return;
                if (AppState.getInstance().isServerReady()) {
                    launchMain();
                } else {
                    checkServerReadyLoop();
                }
            }
        }, 1000); // check every second
    }

    private void launchMain() {
        finished = true;
        handler.removeCallbacks(timeoutRunnable);
        Intent intent = new Intent(this, MainActivity.class);
        startActivity(intent);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        finished = true;
        handler.removeCallbacksAndMessages(null);
    }
}
