# 🌿 Pulse — Digital Wellness & Mindfulness Companion

Pulse (under-the-hood namespace `aura`) is a next-generation React Native & Expo mobile application designed to rewrite our relationship with technology. Instead of forcing manual logging or generic timers, Pulse uses **passive device telemetry, physical sensor tracking, and real-time biometric gesture analysis** to gauge mental stress and deliver contextual, AI-powered mindfulness interventions.

---

## ✨ Core Pillars & Features

### 1. 📊 Passive Behavioral Telemetry
Pulse runs a lightweight background heartbeat service using `expo-task-manager` and `expo-background-task`. It maps your digital rhythm by monitoring:
* **Pickups & Session Frequency**: Track screen activations and session lengths in real time.
* **Charging States**: Uses `expo-battery` to detect if the phone is plugged in during late-night hours.
* **Ambient Movement**: Leverages `expo-sensors`'s **Accelerometer** to detect whether you are active, resting, or doomscrolling in bed.
* **Notification Backlog**: Detects cognitive overload by monitoring ignored or piled-up notifications.

### 2. ⚡ Biometric Gesture & Swipe Detection
Anxiety and restlessness often manifest physically in how we touch our screens. Pulse listens to interactive touches to capture:
* **Anxious Swiping**: Detects rapid scroll flicks (speeds exceeding $1.0\text{ px/ms}$ with multiple occurrences in $<300\text{ ms}$) as a physical signature of restlessness.
* **Restless Fidgeting**: Tracks sudden surges in phone check rates.

### 3. 🛡️ System-Wide Foreground Overlay (Android Native)
Pulse contains a custom native Android module (`PulseOverlay`) featuring a foreground service:
* **Anti-Doomscroll Takeover**: If the app detects frantic swiping or late-night charging surges, it can draw over other active apps (like social feeds) to pause the cycle.
* **Permission Gate**: Guided onboarding helps users grant the Android "Draw Over Other Apps" permission seamlessly.

### 4. 🧠 Empathetic Gemini AI Companion
Pulse features an interactive wellness chat powered by Google's **Gemini API** (`gemini-2.0-flash-lite`):
* **Context-Aware Responses**: Gemini receives anonymized real-time telemetry (stress score, pickups, late-night insomnia signals) to shape conversations organically.
* **Anti-Preachy Tone**: Designed to sound like a supportive friend rather than a clinical algorithm.
* **Crisis Safety Guard**: Intercepts safety-critical keywords instantly to display suicide and crisis hotlines.
* **Dashboard Reflections**: Generates daily dashboard mindfulness insights and weekly summaries.

### 5. 🪷 Interactive Box Breathing
When a high-stress deviation is detected, Pulse guides the user through box breathing exercises:
* **Dynamic Visualization**: A beautiful animated breathing circle that resizes and shifts colors dynamically based on the breathing phase (**Inhale** $\rightarrow$ **Hold** $\rightarrow$ **Exhale** $\rightarrow$ **Hold**).
* **Reset Loop**: Completing the exercise calms the nervous system and programmatically resets stress score metrics.

---

## 🛠️ Tech Stack & Key Libraries

* **Framework**: React Native 0.81 & Expo 54 SDK
* **Navigation**: Expo Router (v6) with declarative file-based layout routing.
* **State Management**: Zustand (v5) for global state synchronization across background threads and active screens.
* **AI Integration**: Official `@google/generative-ai` SDK.
* **Styling**: NativeWind (Tailwind CSS v3/v4 wrapper) with custom gradients and glassmorphism styling.
* **Sensors**: `expo-sensors`, `expo-battery`, and `expo-notifications`.
* **Data Vis**: `react-native-gifted-charts` & `react-native-svg`.

---

## 📂 Project Architecture

```
Pulse/
├── app/                  # Expo Router views
│   ├── (tabs)/           # Core tab screens (Home, Chat, Patterns, Settings)
│   ├── (modals)/         # System takeovers and nudge modals
│   ├── onboarding.tsx    # First-launch configuration and permission guides
│   └── _layout.tsx       # Root layout configuration
├── components/           # Reusable UI widgets
│   ├── Orb.tsx           # Breathing visualization orb
│   ├── BaselineProgress. # Baseline comparison bar
│   ├── BoxBreathing.tsx  # In-app breathing helper
│   └── NudgeBanner.tsx   # Persistent non-obtrusive alert bar
├── store/
│   └── useAuraStore.ts   # Zustand global store
├── lib/                  # Services and core logic
│   ├── GeminiClient.ts   # Gemini API endpoints, prompts, & local fallbacks
│   ├── SignalEngine.ts   # Main sensor and background event manager
│   ├── StressCalculator. # Mathematical stress scoring algorithm
│   ├── detector.ts       # Behavioral deviation analyzer
│   ├── storage.ts        # Async storage manager
│   └── OverlayModule.ts  # Native Android draw-over bridge
└── app.config.js         # Expo SDK, app identifiers, and plugins configuration
```

---

## 🚀 Setting Up the Project

### Prerequisites
Make sure you have Node.js, `npm`, and the Expo CLI installed. To run the app on a physical device or emulator, install the [Expo Go](https://expo.dev/go) client or set up an emulator environment.

### 1. Clone & Install Dependencies
Navigate to the root directory and install packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory and configure your Gemini API Key:
```env
EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key_here
```
*(Alternatively, you can pass this as an environment variable when running Expo).*

### 3. Start the Development Server
Run the Metro Bundler:
```bash
npx expo start
```
* Press `i` to open in the iOS Simulator.
* Press `a` to open on Android Emulator.
* Scan the QR code with your phone's camera (iOS) or Expo Go app (Android) to run on a physical device.

---

## 🔬 How the Stress Algorithm Works
The stress index is calculated in [StressCalculator.ts](file:///Users/fahimiamir/Pulse/lib/StressCalculator.ts) on a scale of $0 - 100$:

$$\text{Stress Score} = \text{Base (20)} + S_{\text{pickup}} + S_{\text{session}} + S_{\text{insomnia}} + S_{\text{charging}} + S_{\text{deviation}}$$

Where:
* $S_{\text{pickup}}$: Up to $+25$ points depending on phone pickup frequency in the last hour ($>12$ pickups adds maximum penalty).
* $S_{\text{session}}$: $+5$ to $+20$ points depending on the duration of the current active session ($>60$ minutes adds $+20$).
* $S_{\text{insomnia}}$: $+20$ points if activity is recorded between 11:00 PM and 5:00 AM while the phone is charging (high correlation with doomscrolling).
* $S_{\text{deviation}}$: $+10$ points if the current hour's activity exceeds the established historic baseline for that specific time bucket by $1.5\times$.
