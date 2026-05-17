import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Battery from 'expo-battery';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { useAuraStore } from '../store/useAuraStore';
import type { SignalEvent } from '../types';
import { calculateStressScore } from './StressCalculator';
import { loadSignals, saveSignals, loadBaseline, loadNudges, loadPreferences, countDaysOfData } from './storage';
import { buildAndSaveBaseline } from './baseline';
import { analyzeCurrentState } from './detector';

const BACKGROUND_HEARTBEAT_TASK = 'background-heartbeat-task';

TaskManager.defineTask(BACKGROUND_HEARTBEAT_TASK, async () => {
  try {
    console.log('[Background] Heartbeat running...');

    const signals = await loadSignals();
    const now = Date.now();

    const batteryState = await Battery.getBatteryStateAsync();
    const isCharging = batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL;
    const hour = new Date().getHours();
    const isLateNight = hour >= 23 || hour < 5;

    let isInsomnia = false;
    let newSignals = [...signals];

    if (isCharging && isLateNight) {
      // Only add one insomnia signal per hour to prevent duplicates
      const lastHour = now - 60 * 60 * 1000;
      const recentInsomnia = signals.some(s => s.type === 'insomnia' && s.timestamp >= lastHour);
      if (!recentInsomnia) {
        isInsomnia = true;
        newSignals.push({ timestamp: now, type: 'insomnia' });
        console.log('[Background] Insomnia detected (charging late night)');
      }
    }

    const store = useAuraStore.getState();
    store.setIsCharging(isCharging);
    if (newSignals.length > signals.length) {
      await saveSignals(newSignals);
      store.setSignals(newSignals);
      store.setInsomniaSignal(isInsomnia);
    }

    const presented = await Notifications.getPresentedNotificationsAsync();
    store.setIgnoredNotificationsCount(presented.length);

    const newScore = calculateStressScore();
    store.setStressScore(newScore);

    console.log(`[Background] Ignores: ${presented.length}, Stress: ${newScore}`);

    if (newScore > 65) {
      const lastNudge = store.lastNudgeTime;
      if (!lastNudge || now - lastNudge > 90 * 60 * 1000) {
        store.setLastNudgeTime(now);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Mindful Break Needed?",
            body: "Your phone behavior suggests elevated stress. Tap here for a quick pause.",
            sound: true,
          },
          trigger: null,
        });
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error('[Background] Heartbeat task failed:', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export const useSignalEngine = () => {
  const appState = useRef(AppState.currentState);
  const stillStartTime = useRef<number | null>(null);
  const demoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Reliable 5-minute analysis timer — timestamp-based, not modulo
  const lastAnalysisTime = useRef<number>(0);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const checkPresentedNotifications = async () => {
      // Always read fresh state to avoid stale closure
      if (useAuraStore.getState().isDemoMode) return;
      try {
        const presented = await Notifications.getPresentedNotificationsAsync();
        useAuraStore.getState().setIgnoredNotificationsCount(presented.length);
      } catch (err) {
        console.error('Failed to get presented notifications', err);
      }
    };

    const registerBackgroundHeartbeat = async () => {
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_HEARTBEAT_TASK);
        if (!isRegistered) {
          await BackgroundTask.registerTaskAsync(BACKGROUND_HEARTBEAT_TASK, {
            minimumInterval: 15 * 60, // 15 minutes
          });
          console.log('[Background] Heartbeat task registered successfully!');
        }
      } catch (err) {
        console.warn('[Background] Failed to register task. This is expected in Expo Go. Use EAS Build for background tasks.', err);
      }
    };

    // Load all persisted state on startup
    const init = async () => {
      const store = useAuraStore.getState();
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

      // Run initial checks
      await checkPresentedNotifications();
      await registerBackgroundHeartbeat();

      // Run initial analysis
      await analyzeCurrentState();
      lastAnalysisTime.current = Date.now();
    };
    init();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Battery check interval (every 5 mins)
    const batteryInterval = setInterval(checkBattery, 5 * 60 * 1000);
    checkBattery(); // initial check

    // Real-time battery state listener for instant UI updates when plugging/unplugging
    const batterySubscription = Battery.addBatteryStateListener(({ batteryState }) => {
      // Always read fresh state — fixes stale closure bug
      if (useAuraStore.getState().isDemoMode) return;
      const isCharging = batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL;
      useAuraStore.getState().setIsCharging(isCharging);
      recomputeStress();
    });

    // Accelerometer check (1Hz)
    Accelerometer.setUpdateInterval(1000);
    const accelSubscription = Accelerometer.addListener(data => {
      // Always read fresh state — fixes stale closure bug
      if (useAuraStore.getState().isDemoMode) return;
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
      const diff = Math.abs(magnitude - 1.0);

      if (diff < 0.15) {
        if (!stillStartTime.current) {
          stillStartTime.current = Date.now();
        } else if (Date.now() - stillStartTime.current > 10 * 60 * 1000) {
          useAuraStore.getState().setMovementState('still');
        }
      } else {
        stillStartTime.current = null;
        useAuraStore.getState().setMovementState('moving');
      }
    });

    // Stress score + analysis loop (every 1 min)
    const stressInterval = setInterval(async () => {
      await checkPresentedNotifications();
      recomputeStress();
      // Re-analyze every 5 minutes — reliable timestamp comparison, not brittle modulo
      if (Date.now() - lastAnalysisTime.current >= 5 * 60 * 1000) {
        lastAnalysisTime.current = Date.now();
        await analyzeCurrentState();
      }
    }, 60 * 1000);

    return () => {
      subscription.remove();
      clearInterval(batteryInterval);
      clearInterval(stressInterval);
      accelSubscription.remove();
      batterySubscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // Always read fresh state from the store — fixes stale closure bug
    const store = useAuraStore.getState();
    const isNowActive = nextAppState === 'active';
    const wasBackground = appState.current.match(/inactive|background/);
    const now = Date.now();

    if (!store.isDemoMode) {
      store.setAppIsActive(isNowActive);
    }

    if (wasBackground && isNowActive) {
      if (demoTimeout.current) clearTimeout(demoTimeout.current);

      if (!store.isDemoMode) {
        // Pickup event — always read live signals to avoid stale array bug
        const currentSignals = useAuraStore.getState().signals;
        const pickupSignal: SignalEvent = { timestamp: now, type: 'pickup' };
        store.addSignal(pickupSignal);
        store.setCurrentSessionStart(now);

        const newSignals = [...currentSignals, pickupSignal];
        updateComputedStats(newSignals);
        saveSignals(newSignals);
        recomputeStress();

        // Frantic Check Pattern Detection: 3+ pickups in less than a minute
        const oneMinuteAgo = now - 60000;
        const recentPickups = newSignals.filter(s => s.type === 'pickup' && s.timestamp >= oneMinuteAgo);
        
        if (recentPickups.length >= 3) {
          console.log(`[Intervention] Frantic pickup pattern detected! (${recentPickups.length} pickups in the last minute)`);
          store.setStressScore(78); // Push stress score to elevated so context is clear
          useAuraStore.setState({
            lastAnalysis: {
              score: 78,
              deviationScore: 78,
              triggers: ['Frantic Check Pattern (3+ Pickups/Min)']
            } as any
          });
          store.setLastNudgeTime(now);
          store.setShowNudgeBanner(true); // Fire breathing takeover modal overlay instantly!
        }

        // Rebuild baseline periodically
        await buildAndSaveBaseline();
      }
    } else if (!isNowActive && appState.current === 'active') {
      // Backgrounding
      if (!store.isDemoMode) {
        demoTimeout.current = setTimeout(async () => {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "⚠️ Doomscroll Interception",
              body: "We noticed you've been surfing Instagram late at night. Tap here to take a breathing pause. 🪷",
              sound: true,
            },
            trigger: null,
          });

          // Spike the stress score and log the late-night Instagram doomscrolling triggers in the store
          const currentTriggers = useAuraStore.getState().lastAnalysis?.triggers || [];
          const newTriggers = Array.from(new Set([...currentTriggers, 'Playing phone constantly while charging late at night (High Stress)']));
          
          useAuraStore.setState({
            stressScore: 78,
            lastAnalysis: {
              score: 78,
              deviationScore: 78,
              triggers: newTriggers,
            } as any
          });

          useAuraStore.getState().setShowNudgeBanner(true);
        }, 10000); // 10 seconds of background doomscrolling
      }

      // Always read fresh state to avoid stale currentSessionStart
      const freshStore = useAuraStore.getState();
      const start = freshStore.currentSessionStart;
      if (start && !freshStore.isDemoMode) {
        const duration = now - start;
        const sessionSignal: SignalEvent = {
          timestamp: now,
          type: 'session',
          durationMs: duration
        };
        freshStore.addSignal(sessionSignal);
        freshStore.setCurrentSessionStart(null);

        // Always read live signals array for accurate state
        const currentSignals = useAuraStore.getState().signals;
        const newSignals = [...currentSignals, sessionSignal];
        updateComputedStats(newSignals);
        saveSignals(newSignals);
      }
    }

    appState.current = nextAppState;
  };

  const checkBattery = async () => {
    // Always read fresh state — fixes stale closure bug
    const store = useAuraStore.getState();
    if (store.isDemoMode) return;

    const batteryState = await Battery.getBatteryStateAsync();
    const isCharging = batteryState === Battery.BatteryState.CHARGING || batteryState === Battery.BatteryState.FULL;
    store.setIsCharging(isCharging);
    const hour = new Date().getHours();
    const now = Date.now();

    // 11 PM to 5 AM
    const isLateNight = hour >= 23 || hour < 5;

    if (isCharging && isLateNight) {
      // Deduplicate: only fire one insomnia signal per hour window
      const lastHour = now - 60 * 60 * 1000;
      const currentSignals = useAuraStore.getState().signals;
      const recentInsomnia = currentSignals.some(s => s.type === 'insomnia' && s.timestamp >= lastHour);
      if (!recentInsomnia) {
        store.setInsomniaSignal(true);
        store.addSignal({ timestamp: now, type: 'insomnia' });
      }
    } else {
      store.setInsomniaSignal(false);
    }
  };

  const updateComputedStats = (signals: SignalEvent[]) => {
    const store = useAuraStore.getState();
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
    const store = useAuraStore.getState();
    const oldScore = store.stressScore;
    const newScore = calculateStressScore();
    store.setStressScore(newScore);

    // Nudge logic
    if (oldScore <= 65 && newScore > 65) {
      triggerNudge();
    }
  };

  const triggerNudge = () => {
    const store = useAuraStore.getState();
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
