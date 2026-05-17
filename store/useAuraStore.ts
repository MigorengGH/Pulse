import { create } from 'zustand';
import type { BaselineData, NudgeRecord, AnalysisResult, UserPreferences, SignalEvent } from '../types';

export type { SignalEvent } from '../types';

interface AuraState {
  // ─── Signals ────────────────────────────────────────────────
  signals: SignalEvent[];
  stressScore: number;
  currentSessionStart: number | null;
  insomniaSignal: boolean;
  movementState: 'still' | 'moving' | 'unknown';
  pickupsToday: number;
  pickupsLastHour: number;
  lastPickupTime: number | null;
  ignoredNotificationsCount: number;

  // ─── Nudge ──────────────────────────────────────────────────
  lastNudgeTime: number | null;
  showNudgeBanner: boolean;
  nudgeHistory: NudgeRecord[];

  // ─── Baseline & Deviation ───────────────────────────────────
  baseline: BaselineData | null;
  deviationScore: number;
  lastAnalysis: AnalysisResult | null;

  // ─── App State ──────────────────────────────────────────────
  appIsActive: boolean;
  onboardingComplete: boolean;
  daysOfData: number;

  // ─── User Preferences ──────────────────────────────────────
  preferences: UserPreferences;

  // ─── Actions ────────────────────────────────────────────────
  setSignals: (signals: SignalEvent[]) => void;
  addSignal: (signal: SignalEvent) => void;
  setStressScore: (score: number) => void;
  setCurrentSessionStart: (time: number | null) => void;
  setInsomniaSignal: (isInsomnia: boolean) => void;
  setMovementState: (state: 'still' | 'moving' | 'unknown') => void;
  setPickups: (today: number, lastHour: number, lastPickup: number | null) => void;
  setIgnoredNotificationsCount: (count: number) => void;
  setLastNudgeTime: (time: number | null) => void;
  setShowNudgeBanner: (show: boolean) => void;
  setNudgeHistory: (nudges: NudgeRecord[]) => void;
  addNudge: (nudge: NudgeRecord) => void;
  setBaseline: (baseline: BaselineData | null) => void;
  setDeviationScore: (score: number) => void;
  setLastAnalysis: (analysis: AnalysisResult | null) => void;
  setAppIsActive: (isActive: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setDaysOfData: (days: number) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  resetBaseline: () => void;
}

export const useAuraStore = create<AuraState>((set) => ({
  // ─── Initial State ──────────────────────────────────────────
  signals: [],
  stressScore: 30,
  currentSessionStart: null,
  insomniaSignal: false,
  movementState: 'unknown',
  pickupsToday: 0,
  pickupsLastHour: 0,
  lastPickupTime: null,
  ignoredNotificationsCount: 0,
  lastNudgeTime: null,
  showNudgeBanner: false,
  nudgeHistory: [],
  baseline: null,
  deviationScore: 0,
  lastAnalysis: null,
  appIsActive: true,
  onboardingComplete: false,
  daysOfData: 0,
  preferences: {
    nudgesEnabled: true,
    lateNightMode: true,
    quietHoursStart: 0,
    quietHoursEnd: 7,
  },

  // ─── Actions ────────────────────────────────────────────────
  setSignals: (signals) => set({ signals }),
  addSignal: (signal) => set((state) => ({ signals: [...state.signals, signal] })),
  setStressScore: (stressScore) => set({ stressScore }),
  setCurrentSessionStart: (currentSessionStart) => set({ currentSessionStart }),
  setInsomniaSignal: (insomniaSignal) => set({ insomniaSignal }),
  setMovementState: (movementState) => set({ movementState }),
  setPickups: (pickupsToday, pickupsLastHour, lastPickupTime) => set({ pickupsToday, pickupsLastHour, lastPickupTime }),
  setIgnoredNotificationsCount: (ignoredNotificationsCount) => set({ ignoredNotificationsCount }),
  setLastNudgeTime: (lastNudgeTime) => set({ lastNudgeTime }),
  setShowNudgeBanner: (showNudgeBanner) => set({ showNudgeBanner }),
  setNudgeHistory: (nudgeHistory) => set({ nudgeHistory }),
  addNudge: (nudge) => set((state) => ({ nudgeHistory: [nudge, ...state.nudgeHistory] })),
  setBaseline: (baseline) => set({ baseline }),
  setDeviationScore: (deviationScore) => set({ deviationScore }),
  setLastAnalysis: (lastAnalysis) => set({ lastAnalysis }),
  setAppIsActive: (appIsActive) => set({ appIsActive }),
  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),
  setDaysOfData: (daysOfData) => set({ daysOfData }),
  setPreferences: (prefs) => set((state) => ({
    preferences: { ...state.preferences, ...prefs },
  })),
  resetBaseline: () => set({ baseline: null, deviationScore: 0, lastAnalysis: null }),
}));
