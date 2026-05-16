import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';
import { Accelerometer } from 'expo-sensors';
import { useAuraStore } from '../store/useAuraStore';
import type { SignalEvent } from '../types';
import { calculateStressScore } from './StressCalculator';
import { loadSignals, saveSignals, loadBaseline, loadNudges, loadPreferences, countDaysOfData } from './storage';
import { buildAndSaveBaseline } from './baseline';
import { analyzeCurrentState } from './detector';

export const useSignalEngine = () => {
  const store = useAuraStore();
  const appState = useRef(AppState.currentState);
  const stillStartTime = useRef<number | null>(null);

  useEffect(() => {
    // Load all persisted state on startup
    const init = async () => {
      const signals = await loadSignals();
      store.setSignals(signals);
      updateComputedStats(signals);
      store.setDaysOfData(countDaysOfData(signals));

      const baseline = await loadBaseline();
      if (baseline) store.setBaseline(baseline);

      const nudges = await loadNudges();
      store.setNudgeHistory(nudges);

      const prefs = await loadPreferences();
      store.setPreferences(prefs);

      // Try to build/refresh baseline on startup
      await buildAndSaveBaseline();

      // Run initial analysis
      await analyzeCurrentState();
    };
    init();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Battery check interval (every 5 mins)
    const batteryInterval = setInterval(checkBattery, 5 * 60 * 1000);
    checkBattery(); // initial check

    // Accelerometer check (1Hz)
    Accelerometer.setUpdateInterval(1000);
    const accelSubscription = Accelerometer.addListener(data => {
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const diff = Math.abs(magnitude - 1.0);

      if (diff < 0.15) {
        if (!stillStartTime.current) {
          stillStartTime.current = Date.now();
        } else if (Date.now() - stillStartTime.current > 10 * 60 * 1000) {
          store.setMovementState('still');
        }
      } else {
        stillStartTime.current = null;
        store.setMovementState('moving');
      }
    });

    // Stress score + analysis loop (every 1 min)
    const stressInterval = setInterval(async () => {
      recomputeStress();
      // Re-analyze every 5 minutes
      if (Date.now() % (5 * 60 * 1000) < 60 * 1000) {
        await analyzeCurrentState();
      }
    }, 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(batteryInterval);
      clearInterval(stressInterval);
      accelSubscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const isNowActive = nextAppState === 'active';
    const wasBackground = appState.current.match(/inactive|background/);
    const now = Date.now();

    store.setAppIsActive(isNowActive);

    if (wasBackground && isNowActive) {
      // Pickup event
      const pickupSignal: SignalEvent = { timestamp: now, type: 'pickup' };
      store.addSignal(pickupSignal);
      store.setCurrentSessionStart(now);

      const newSignals = [...store.signals, pickupSignal];
      updateComputedStats(newSignals);
      saveSignals(newSignals);
      recomputeStress();

      // Rebuild baseline periodically
      await buildAndSaveBaseline();
    } else if (!isNowActive && appState.current === 'active') {
      // Backgrounding
      const start = store.currentSessionStart;
      if (start) {
        const duration = now - start;
        const sessionSignal: SignalEvent = {
          timestamp: now,
          type: 'session',
          durationMs: duration
        };
        store.addSignal(sessionSignal);
        store.setCurrentSessionStart(null);

        const newSignals = [...store.signals, sessionSignal];
        updateComputedStats(newSignals);
        saveSignals(newSignals);
      }
    }

    appState.current = nextAppState;
  };

  const checkBattery = async () => {
    const state = await Battery.getBatteryStateAsync();
    const isCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
    const hour = new Date().getHours();

    // 11 PM to 5 AM
    const isLateNight = hour >= 23 || hour < 5;

    if (isCharging && isLateNight) {
      store.setInsomniaSignal(true);
      store.addSignal({ timestamp: Date.now(), type: 'insomnia' });
    } else {
      store.setInsomniaSignal(false);
    }
  };

  const updateComputedStats = (signals: SignalEvent[]) => {
    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const hourAgo = now - 60 * 60 * 1000;

    let today = 0;
    let lastHr = 0;
    let lastPickup: number | null = null;

    signals.forEach(s => {
      if (s.type === 'pickup') {
        if (s.timestamp >= todayStart) today++;
        if (s.timestamp >= hourAgo) lastHr++;
        if (!lastPickup || s.timestamp > lastPickup) lastPickup = s.timestamp;
      }
    });

    store.setPickups(today, lastHr, lastPickup);
  };

  const recomputeStress = () => {
    const oldScore = store.stressScore;
    const newScore = calculateStressScore();
    store.setStressScore(newScore);

    // Nudge logic
    if (oldScore <= 65 && newScore > 65) {
      triggerNudge();
    }
  };

  const triggerNudge = () => {
    const now = Date.now();
    const hour = new Date().getHours();
    const prefs = store.preferences;

    // Respect quiet hours
    if (!prefs.nudgesEnabled) return;
    const inQuietHours = prefs.quietHoursStart <= prefs.quietHoursEnd
      ? (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd)
      : (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd);
    if (inQuietHours) return;

    // Max 1 nudge per 90 mins
    const last = store.lastNudgeTime;
    if (!last || now - last > 90 * 60 * 1000) {
      store.setLastNudgeTime(now);
      store.setShowNudgeBanner(true);
    }
  };
};
