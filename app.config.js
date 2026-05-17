module.exports = {
  name: "Pulse",
  slug: "pulse",
  owner: "haidar1234",
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
      projectId: "04a9f28e-1ad2-47d2-9301-ee6d01504ed4"
    }
  }
};
