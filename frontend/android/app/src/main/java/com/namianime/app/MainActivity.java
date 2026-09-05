package com.namianime.app;

import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // NAMI ANIME — Full dark immersive experience
        Window window = getWindow();

        // Black status bar and navigation bar (matches app dark theme)
        window.setStatusBarColor(0xFF0A0A0F);
        window.setNavigationBarColor(0xFF0A0A0F);

        // Light icons = false → use white icons on dark background
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);

        // Block screenshots and screen recording by default (security)
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // Inject AndroidSecurity bridge for Admin permission toggling
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void enableScreenCapture(boolean enable) {
                    runOnUiThread(() -> {
                        if (enable) {
                            // Admin user: Allow screenshots and screen recording
                            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        } else {
                            // Regular user / Logged out: Block screenshots
                            window.setFlags(
                                WindowManager.LayoutParams.FLAG_SECURE,
                                WindowManager.LayoutParams.FLAG_SECURE
                            );
                        }
                    });
                }
            }, "AndroidSecurity");
        }
    }
}
