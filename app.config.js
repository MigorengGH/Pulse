module.exports = {
  name: "Pulse",
  slug: "aura",
  scheme: "pulse",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F5F7FA"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.mfahimi.pulse"
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#F5F7FA"
    },
    package: "com.mfahimi.pulse",
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-notifications"
  ],
  extra: {
    geminiKey: process.env.EXPO_PUBLIC_GEMINI_KEY || "",
    eas: {
      projectId: "d4923077-5337-478a-b79f-cf2ec942fd40"
    }
  }
};
