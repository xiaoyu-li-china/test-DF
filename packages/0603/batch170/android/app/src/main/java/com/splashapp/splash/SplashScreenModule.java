package com.splashapp.splash;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import javax.annotation.Nonnull;

public class SplashScreenModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "SplashScreen";
    private static boolean isVisible = false;

    public SplashScreenModule(@Nonnull ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Nonnull
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void show() {
        final Activity activity = getCurrentActivity();
        if (activity == null) return;

        isVisible = true;
        new Handler(Looper.getMainLooper()).post(() -> {
            activity.getWindow().setBackgroundDrawableResource(R.drawable.launch_screen);
        });
    }

    @ReactMethod
    public void hide() {
        final Activity activity = getCurrentActivity();
        if (activity == null) return;

        isVisible = false;
        new Handler(Looper.getMainLooper()).post(() -> {
            activity.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
        });
    }

    @ReactMethod
    public void hideWithDelay(double delayMs) {
        final long delay = (long) delayMs;
        final Activity activity = getCurrentActivity();
        if (activity == null) return;

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            isVisible = false;
            activity.getWindow().setBackgroundDrawableResource(android.R.color.transparent);
            sendEvent("SplashScreenHidden", Arguments.createMap());
        }, delay);
    }

    @ReactMethod
    public void isVisible(com.facebook.react.bridge.Callback callback) {
        callback.invoke(isVisible);
    }

    private void sendEvent(String eventName, WritableMap params) {
        ReactApplicationContext context = getReactApplicationContext();
        if (context.hasActiveCatalystInstance()) {
            context
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        }
    }
}
