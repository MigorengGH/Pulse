import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SignalEvent, BaselineData, NudgeRecord, UserPreferences } from '../types';

// ─── Storage Keys ─────────────────────────────────────────────
const SIGNALS_KEY = 'aura_signals';
const INSIGHT_KEY = 'aura_insight';
const INSIGHT_TIME_KEY = 'aura_insight_time';
const BASELINE_KEY = 'aura_baseline';
const NUDGES_KEY = 'aura_nudges';
const ONBOARDING_KEY = 'aura_onboarding_complete';
const PREFERENCES_KEY = 'aura_preferences';

// ─── Signals ──────────────────────────────────────────────────

export const loadSignals = async (): Promise<SignalEvent[]> => {
  try {
    const data = await AsyncStorage.getItem(SIGNALS_KEY);
    if (data) {
      const parsed = JSON.parse(data) as SignalEvent[];
      // Keep only last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return parsed.filter(s => s.timestamp >= sevenDaysAgo);
    }
  } catch (e) {
    console.error('Failed to load signals', e);
  }
  return [];
};

export const saveSignals = async (signals: SignalEvent[]) => {
  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const filtered = signals.filter(s => s.timestamp >= sevenDaysAgo);
    await AsyncStorage.setItem(SIGNALS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save signals', e);
  }
};

// ─── Cached Insight ───────────────────────────────────────────

export const loadCachedInsight = async (): Promise<string | null> => {
  try {
    const timeStr = await AsyncStorage.getItem(INSIGHT_TIME_KEY);
    if (timeStr) {
      const time = parseInt(timeStr, 10);
      // 6 hours cache
      if (Date.now() - time < 6 * 60 * 60 * 1000) {
        return await AsyncStorage.getItem(INSIGHT_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to load insight', e);
  }
  return null;
};

export const saveInsight = async (insight: string) => {
  try {
    await AsyncStorage.setItem(INSIGHT_KEY, insight);
    await AsyncStorage.setItem(INSIGHT_TIME_KEY, Date.now().toString());
  } catch (e) {
    console.error('Failed to save insight', e);
  }
};

// ─── Baseline ─────────────────────────────────────────────────

export const loadBaseline = async (): Promise<BaselineData | null> => {
  try {
    const data = await AsyncStorage.getItem(BASELINE_KEY);
    if (data) return JSON.parse(data) as BaselineData;
  } catch (e) {
    console.error('Failed to load baseline', e);
  }
  return null;
};

export const saveBaseline = async (baseline: BaselineData) => {
  try {
    await AsyncStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch (e) {
    console.error('Failed to save baseline', e);
  }
};

export const clearBaseline = async () => {
  try {
    await AsyncStorage.removeItem(BASELINE_KEY);
  } catch (e) {
    console.error('Failed to clear baseline', e);
  }
};

// ─── Nudge History ────────────────────────────────────────────

export const loadNudges = async (): Promise<NudgeRecord[]> => {
  try {
    const data = await AsyncStorage.getItem(NUDGES_KEY);
    if (data) return JSON.parse(data) as NudgeRecord[];
  } catch (e) {
    console.error('Failed to load nudges', e);
  }
  return [];
};

export const saveNudge = async (nudge: NudgeRecord) => {
  try {
    const existing = await loadNudges();
    // Keep last 50 nudges
    const updated = [nudge, ...existing].slice(0, 50);
    await AsyncStorage.setItem(NUDGES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save nudge', e);
  }
};

export const getRecentNudges = async (limit: number = 5): Promise<NudgeRecord[]> => {
  const nudges = await loadNudges();
  return nudges.slice(0, limit);
};

// ─── Onboarding ───────────────────────────────────────────────

export const loadOnboardingComplete = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === 'true';
  } catch (e) {
    return false;
  }
};

export const saveOnboardingComplete = async () => {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  } catch (e) {
    console.error('Failed to save onboarding state', e);
  }
};

// ─── Preferences ──────────────────────────────────────────────

const defaultPreferences: UserPreferences = {
  nudgesEnabled: true,
  lateNightMode: true,
  quietHoursStart: 0,
  quietHoursEnd: 7,
};

export const loadPreferences = async (): Promise<UserPreferences> => {
  try {
    const data = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (data) return { ...defaultPreferences, ...JSON.parse(data) };
  } catch (e) {
    console.error('Failed to load preferences', e);
  }
  return defaultPreferences;
};

export const savePreferences = async (prefs: UserPreferences) => {
  try {
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences', e);
  }
};

// ─── Utility: Count unique days in signal history ─────────────

export const countDaysOfData = (signals: SignalEvent[]): number => {
  const uniqueDays = new Set(
    signals.map(s => new Date(s.timestamp).toDateString())
  );
  return uniqueDays.size;
};
