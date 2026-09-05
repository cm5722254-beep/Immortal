package com.merdonghua.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // By default, block screenshots and screen recording for all regular users
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        // Inject AndroidSecurity JavaScript bridge for dynamic Admin permission toggling
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void enableScreenCapture(boolean enable) {
                    runOnUiThread(() -> {
                        if (enable) {
                            // Admin user: Allow screenshots and screen recording
                            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                        } else {
                            // Regular user / Logged out: Block screenshots and screen recording
                            getWindow().setFlags(
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

