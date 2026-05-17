import { useAuraStore } from '../store/useAuraStore';
import { getCurrentTimeBucket } from './baseline';

export const calculateStressScore = (): number => {
  const state = useAuraStore.getState();
  const timeBucket = getCurrentTimeBucket();

  let score = 20; // Lower base score

  const now = Date.now();
  const pickupsLastMinute = state.signals.filter(
    (s) => s.type === 'pickup' && s.timestamp >= now - 60 * 1000
  ).length;

  // ─── Pickup frequency (last hour or minute) ────────────────
  if (pickupsLastMinute >= 5 || state.pickupsLastHour >= 5) {
    score += 15; // Labeled as Stress
  } else if (state.pickupsLastHour > 12) {
    score += 25;
  } else if (state.pickupsLastHour > 8) {
    score += 15;
  } else if (state.pickupsLastHour > 5) {
    score += 8;
  }

  // ─── Current session duration ──────────────────────────────
  let sessionDuration = 0;
  if (state.currentSessionStart) {
    sessionDuration = (Date.now() - state.currentSessionStart) / (1000 * 60);
  }

  if (sessionDuration > 60) {
    score += 20;
  } else if (sessionDuration > 45) {
    score += 12;
  } else if (sessionDuration > 30) {
    score += 5;
  }

  // ─── Insomnia signal ───────────────────────────────────────
  if (state.insomniaSignal) {
    score += 20;
  }

  // ─── Late night + still ────────────────────────────────────
  const isNightBucket = state.isDemoMode ? true : (timeBucket === 'NIGHT');
  const isMovementStill = state.isDemoMode ? true : (state.movementState === 'still');
  if (isNightBucket) {
    score += 10; // Being on phone at night adds baseline stress
    if (isMovementStill) {
      score += 10; // Still and on phone late = doomscrolling
    }
  }

  // ─── Ignored notifications ──────────────────────────────────
  if (state.ignoredNotificationsCount >= 3) {
    score += 10; // High uncleared notification count adds to stress index
  }

  // ─── Charging late night + playing phone constantly ────────
  const constantPlayThresholdMins = state.isDemoMode ? (15 / 60) : 15; // 15 seconds in demo mode, 15 minutes in real life
  const isPlayingConstantly = sessionDuration >= constantPlayThresholdMins || state.pickupsLastHour >= 5 || pickupsLastMinute >= 5;
  const isChargingState = state.isDemoMode ? true : state.isCharging;
  if (isChargingState && isNightBucket && isPlayingConstantly) {
    score += 25; // High stress index penalty
  }

  // ─── Deviation awareness (if baseline exists) ──────────────
  if (state.baseline) {
    const bucketBaseline = state.baseline.buckets[timeBucket];
    if (bucketBaseline.sampleCount > 0 && state.pickupsLastHour > bucketBaseline.avgAppSwitches * 1.5) {
      score += 10; // Above baseline for this time of day
    }
  }

  return Math.min(100, Math.max(0, score));
};
