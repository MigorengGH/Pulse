package com.mfahimi.pulse.overlay

import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*

class PulseOverlayModule(private val reactContext: ReactApplicationContext)
  : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PulseOverlay"

  /** Start the foreground service — overlay appears after [delayMs] ms */
  @ReactMethod
  fun startMonitor(delayMs: Double) {
    val intent = Intent(reactContext, PulseOverlayService::class.java).apply {
      action = PulseOverlayService.ACTION_START
      putExtra("delayMs", delayMs.toLong())
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactContext.startForegroundService(intent)
    } else {
      reactContext.startService(intent)
    }
  }

  /** Cancel any pending overlay and stop the service */
  @ReactMethod
  fun stopMonitor() {
    val intent = Intent(reactContext, PulseOverlayService::class.java).apply {
      action = PulseOverlayService.ACTION_STOP
    }
    reactContext.startService(intent)
  }

  /** Returns true if the SYSTEM_ALERT_WINDOW permission is granted */
  @ReactMethod
  fun hasPermission(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  /** Opens the Android settings page so the user can grant Draw Over Apps */
  @ReactMethod
  fun requestPermission() {
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      android.net.Uri.parse("package:${reactContext.packageName}")
    ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
    reactContext.startActivity(intent)
  }
}
