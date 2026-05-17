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
    bundleIdentifier: "com.mfahimi.pulse",
    infoPlist: {
      UIBackgroundModes: ["processing", "process"],
      BGTaskSchedulerPermittedIdentifiers: ["com.expo.modules.backgroundtask.processing"]
    }
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
      projectId: "2d8b157c-5060-463c-9b6e-ad755d405677"
    }
  }
};
