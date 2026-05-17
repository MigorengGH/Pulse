# 🪷 Pulse Biometric Wellness Telemetry & Signal Catalog

Welcome to the central telemetry blueprint of the **Pulse** wellness companion. This document catalogs all passive behavioral signals, context rules, and advanced wellness triggers analyzed by on-device intelligence to protect your cognitive and digital wellbeing.

---

## 📊 1. Core Passive Telemetry Signals
These low-level events are continuously captured and aggregated into raw telemetry buckets inside the central Zustand store (`useAuraStore.ts`):

| Signal Type | Type Definition | How it is Captured | Wellness Indication |
| :--- | :--- | :--- | :--- |
| **`pickup`** | `SignalEvent` | Screen-on transitions, wakes, or unlocks. | **Hyper-vigilance Rate:** Measures compulsive checking urges. |
| **`session`** | `SignalEvent` | Continuous active duration (start/end in ms). | **Digital Engagement Depth:** Measures cognitive focus drain. |
| **`still`** | `SignalEvent` | Accelerometer reads `still` (sedentary status). | **Physical Immobility:** Identifies in-bed screen habits. |
| **`moving`** | `SignalEvent` | Accelerometer reads `moving` (ambulation status). | **Physical Activity:** Correlates to movement and active pacing. |
| **`insomnia`** | `SignalEvent` | Device charging while repeating unlocks late at night. | **Circadian Disruption:** Identifies active screen time when asleep. |

---

## 🧠 2. Contextual Device Telemetry
Additional environmental inputs that layer high-fidelity context onto raw sensor signals:

*   **`isCharging`**: Power supply connection. Indicates when you are in bed or at your charging station.
*   **`ignoredNotificationsCount`**: The number of push alerts left unread. Flags **avoidance, mental fatigue, or social withdrawal**.
*   **`appSwitchCount`**: Active window switches. Measures **focus fragmentation** and attention scatter.

---

## ⚡ 3. Advanced Behavioral Pattern Detectors
The engine (`lib/detector.ts` and `lib/SignalEngine.ts`) applies threshold-deviation rules against your **historical averages** to trigger passive interventions:

### 1. Frantic Check Pattern (Nervous Checking Loop)
*   **Biometric Signature:** `3+ pickups` in less than `60 seconds`.
*   **Intervention:** Instantly elevates stress to **`78%`**, tags `"Frantic Check Pattern (3+ Pickups/Min)"`, and displays the full-screen guided **Box Breathing modal** to break checking loops.

### 2. Erratic Swipe Pattern (High-Velocity Scrolling)
*   **Biometric Signature:** Real-time movement gestures exceeding velocity thresholds.
*   **Intervention:** Triggers the sky-blue **Nervous System Intercept** overlay with bio-sensory grounding prompts.

### 3. Passive Late-Night Doomscrolling (e.g. Instagram/Social Apps)
*   **Biometric Signature:** Pulse app is backgrounded late at night (23:00 - 05:00) with no active returns.
*   **Intervention:** If you remain in other apps for **10 seconds**, a local push notification fires:
    > **⚠️ Doomscroll Interception**
    > We noticed you've been surfing Instagram late at night. Tap here to take a breathing pause. 🪷
    Spikes stress to **`78%`**, logs `"Playing phone constantly while charging late at night (High Stress)"`, and launches the guided takeover on return.

### 4. Late-Night In-Bed Scrolling
*   **Biometric Signature:** Still motion state + Late-Night hours (23:00 - 05:00) + active screen session.
*   **Intervention:** Contributes **+15** points to stress levels, indicating melatonin suppression.

### 5. Scatterbrained App Switching
*   **Biometric Signature:** App switches exceed **150%** of your historical baseline for the current time bucket.
*   **Intervention:** Contributes **+30** points to stress levels, flagging focus fragmentation.

---

## 🔋 4. Biometric Wellness Badges
These aggregates are converted into real-time percentages in your **Patterns Dashboard Grid**:

1.  **Sleep Disruption Risk 🌙**: Compares late-night charging screen-sessions and in-bed still scrolling.
2.  **Cognitive Restlessness 🧠**: Assesses frantic checking loops and app-switching spikes.
3.  **Calm Recovery Rate 🔋**: Calculates how effectivelyGuided Box Breathing resets your stress levels back to baseline (`10%`).

---

## 🧪 5. Testing Passive Telemetry Locally
You can test these real-time detectors inside the **Expo Go** environment:

*   **To Test Frantic Checking:** Unlock/lock the app 3 times in under 60 seconds. The Box Breathing screen will intercept you instantly.
*   **To Test Instagram Backgrounding:** Background the app, wait 10 seconds, receive the push alert, and tap it to launch recovery!
