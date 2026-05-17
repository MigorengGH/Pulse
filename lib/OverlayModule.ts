import { NativeModules, Platform } from 'react-native';

const { PulseOverlay } = NativeModules;

/**
 * Starts the native Android foreground service.
 * After [delayMs] milliseconds the overlay will appear on top of any app
 * (including Instagram). On iOS this is a no-op.
 */
export const startOverlayMonitor = (delayMs = 10000) => {
  if (Platform.OS === 'android' && PulseOverlay) {
    PulseOverlay.startMonitor(delayMs);
  }
};

/**
 * Cancels a pending overlay and stops the foreground service.
 * Call this when the user comes back to Pulse.
 */
export const stopOverlayMonitor = () => {
  if (Platform.OS === 'android' && PulseOverlay) {
    PulseOverlay.stopMonitor();
  }
};

/**
 * Returns true if the "Draw Over Other Apps" permission is granted.
 */
export const hasOverlayPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || !PulseOverlay) return false;
  return PulseOverlay.hasPermission();
};

/**
 * Opens Android Settings so the user can grant "Draw Over Other Apps".
 */
export const requestOverlayPermission = () => {
  if (Platform.OS === 'android' && PulseOverlay) {
    PulseOverlay.requestPermission();
  }
};
