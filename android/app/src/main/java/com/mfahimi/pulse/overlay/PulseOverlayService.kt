package com.mfahimi.pulse.overlay

import android.app.*
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.os.*
import android.provider.Settings
import android.view.*
import android.widget.*
import androidx.core.app.NotificationCompat

class PulseOverlayService : Service() {

  companion object {
    const val ACTION_START = "ACTION_START"
    const val ACTION_STOP  = "ACTION_STOP"
    const val CHANNEL_ID   = "pulse_fg_service"
    var isRunning = false
  }

  private var windowManager: WindowManager? = null
  private var overlayView: View? = null
  private val handler = Handler(Looper.getMainLooper())
  private var scheduleRunnable: Runnable? = null

  // Breathing animation
  private val breathPhases   = arrayOf("Inhale", "Hold", "Exhale", "Hold")
  private val breathDurations = longArrayOf(4000, 7000, 8000, 0)
  private var breathIndex = 0
  private var breathCountdown = 4
  private var breathTimer: CountDownTimer? = null
  private var breathTextView: TextView? = null
  private var breathSecondsView: TextView? = null
  private var breathCircle: View? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    isRunning = true
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        val delayMs = intent.getLongExtra("delayMs", 10000L)
        startForeground(9001, buildForegroundNotification())
        scheduleRunnable = Runnable { if (isRunning) showOverlay() }
        handler.postDelayed(scheduleRunnable!!, delayMs)
      }
      ACTION_STOP -> {
        scheduleRunnable?.let { handler.removeCallbacks(it) }
        dismissOverlay()
        stopForeground(true)
        stopSelf()
      }
    }
    return START_NOT_STICKY
  }

  // ─── Foreground notification (required on Android 8+) ──────────────────────
  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val ch = NotificationChannel(CHANNEL_ID, "Pulse Wellness", NotificationManager.IMPORTANCE_MIN)
      ch.setShowBadge(false)
      (getSystemService(NotificationManager::class.java)).createNotificationChannel(ch)
    }
  }

  private fun buildForegroundNotification(): Notification =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Pulse is watching over you 🌿")
      .setContentText("Digital wellness monitoring active")
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setOngoing(true)
      .build()

  // ─── Overlay display ────────────────────────────────────────────────────────
  private fun showOverlay() {
    if (!Settings.canDrawOverlays(this)) return
    if (overlayView != null) return
    handler.post {
      val view = buildOverlayView()
      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        type,
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT
      )
      windowManager?.addView(view, params)
      overlayView = view
      startBreathCycle()
    }
  }

  private fun dismissOverlay() {
    handler.post {
      breathTimer?.cancel()
      overlayView?.let { windowManager?.removeView(it); overlayView = null }
    }
  }

  // ─── Build the overlay view programmatically ────────────────────────────────
  private fun buildOverlayView(): View {
    val dp = { n: Int -> (n * resources.displayMetrics.density).toInt() }

    // Root – semi-transparent dark full-screen background
    val root = FrameLayout(this)
    root.setBackgroundColor(Color.parseColor("#E8090D16"))
    root.isClickable = true

    // Card
    val card = LinearLayout(this)
    card.orientation = LinearLayout.VERTICAL
    card.gravity = Gravity.CENTER_HORIZONTAL
    card.setPadding(dp(28), dp(28), dp(28), dp(28))
    val cardBg = GradientDrawable().apply {
      setColor(Color.parseColor("#F00F1729"))
      cornerRadius = dp(28).toFloat()
      setStroke(dp(1), Color.parseColor("#33FFFFFF"))
    }
    card.background = cardBg
    val cardLp = FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.WRAP_CONTENT
    ).apply { setMargins(dp(20), 0, dp(20), 0); gravity = Gravity.CENTER }

    // Shield icon
    val iconTv = TextView(this).apply {
      text = "🛡"; textSize = 26f; gravity = Gravity.CENTER
      setPadding(0, 0, 0, dp(4))
    }

    // Title
    val title = TextView(this).apply {
      text = "Digital Intervention"
      setTextColor(Color.WHITE); textSize = 22f; gravity = Gravity.CENTER
    }

    // Red badge
    val badge = TextView(this).apply {
      text = "LATE NIGHT SCROLLING"
      setTextColor(Color.parseColor("#EF4444")); textSize = 10f
      gravity = Gravity.CENTER; letterSpacing = 0.1f
    }
    val badgeLp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = dp(14) }

    // Body
    val body = TextView(this).apply {
      text = "You've been scrolling for 10 seconds.\nLate-night screen stimulation suppresses melatonin and keeps your nervous system awake."
      setTextColor(Color.parseColor("#CBD5E1")); textSize = 13f
      gravity = Gravity.CENTER; lineSpacingExtra = dp(2).toFloat()
    }
    val bodyLp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = dp(20) }

    // Breathing circle
    val circleFrame = FrameLayout(this)
    val circleFrameLp = LinearLayout.LayoutParams(dp(160), dp(160)).apply {
      gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(6)
    }

    val outerCircle = View(this).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(Color.parseColor("#332DD4BF"))
      }
    }
    val outerLp = FrameLayout.LayoutParams(dp(148), dp(148)).apply { gravity = Gravity.CENTER }

    val innerCircle = FrameLayout(this).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL; setColor(Color.parseColor("#2DD4BF"))
      }
    }
    val innerLp = FrameLayout.LayoutParams(dp(108), dp(108)).apply { gravity = Gravity.CENTER }

    val breathContent = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
    }
    val bTextView = TextView(this).apply {
      text = "Inhale"; setTextColor(Color.WHITE); textSize = 14f; gravity = Gravity.CENTER
    }
    val bSecondsView = TextView(this).apply {
      text = "4"; setTextColor(Color.WHITE); textSize = 22f; gravity = Gravity.CENTER
    }
    breathTextView = bTextView
    breathSecondsView = bSecondsView
    breathCircle = outerCircle

    breathContent.addView(bTextView)
    breathContent.addView(bSecondsView)
    innerCircle.addView(breathContent, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT
    ))
    circleFrame.addView(outerCircle, outerLp)
    circleFrame.addView(innerCircle, innerLp)

    // Hint
    val hint = TextView(this).apply {
      text = "Follow the circle to calm your nervous system..."; textSize = 11f
      setTextColor(Color.parseColor("#94A3B8")); gravity = Gravity.CENTER
    }
    val hintLp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = dp(20) }

    // Take a break button
    val takeBreakBtn = Button(this).apply {
      text = "Take a Mindful Break 🧘"
      setTextColor(Color.WHITE); textSize = 14f
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#2DD4BF")); cornerRadius = dp(16).toFloat()
      }
      setPadding(0, dp(14), 0, dp(14))
    }
    val takeBreakLp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply { bottomMargin = dp(8) }
    takeBreakBtn.setOnClickListener { dismissOverlay(); stopSelf() }

    // Continue button
    val continueBtn = Button(this).apply {
      text = "Continue scrolling"
      setTextColor(Color.parseColor("#64748B")); textSize = 13f
      background = GradientDrawable().apply {
        setColor(Color.TRANSPARENT); cornerRadius = dp(16).toFloat()
        setStroke(dp(1), Color.parseColor("#334155"))
      }
      setPadding(0, dp(12), 0, dp(12))
    }
    continueBtn.setOnClickListener { dismissOverlay(); stopSelf() }

    // Assemble
    card.addView(iconTv)
    card.addView(title)
    card.addView(badge, badgeLp)
    card.addView(body, bodyLp)
    card.addView(circleFrame, circleFrameLp)
    card.addView(hint, hintLp)
    card.addView(takeBreakBtn, takeBreakLp)
    card.addView(continueBtn, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT
    ))
    root.addView(card, cardLp)
    return root
  }

  // ─── Box breathing cycle ────────────────────────────────────────────────────
  private fun startBreathCycle() {
    breathIndex = 0
    runBreathPhase()
  }

  private fun runBreathPhase() {
    val phase = breathPhases[breathIndex % 4]
    val durationMs = breathDurations[breathIndex % 4]
    breathTextView?.text = phase
    val seconds = (durationMs / 1000).toInt()

    // Animate outer circle size
    val circleDp = if (phase == "Inhale") 148 else if (phase == "Exhale") 80 else 148
    val dp = (circleDp * resources.displayMetrics.density).toInt()
    val lp = breathCircle?.layoutParams as? FrameLayout.LayoutParams
    lp?.width = dp; lp?.height = dp; breathCircle?.layoutParams = lp

    breathTimer?.cancel()
    breathTimer = object : CountDownTimer(durationMs, 1000) {
      override fun onTick(ms: Long) {
        breathSecondsView?.text = ((ms / 1000) + 1).toString()
      }
      override fun onFinish() {
        breathSecondsView?.text = "0"
        breathIndex++
        runBreathPhase()
      }
    }.start()
  }

  override fun onDestroy() {
    super.onDestroy()
    isRunning = false
    breathTimer?.cancel()
    scheduleRunnable?.let { handler.removeCallbacks(it) }
    dismissOverlay()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
