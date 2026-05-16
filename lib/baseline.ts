import type { SignalEvent, BaselineData, BucketStats, TimeBucket, UsageSnapshot } from '../types';
import { loadSignals, saveBaseline, loadBaseline, countDaysOfData } from './storage';
import { useAuraStore } from '../store/useAuraStore';

// ─── Time Bucket Helpers ──────────────────────────────────────

export const getCurrentTimeBucket = (): TimeBucket => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 23) return 'EVENING';
  return 'NIGHT';
};

const getTimeBucketForHour = (hour: number): TimeBucket => {
  if (hour >= 6 && hour < 12) return 'MORNING';
  if (hour >= 12 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 23) return 'EVENING';
  return 'NIGHT';
};

// ─── Baseline Readiness Check ─────────────────────────────────

export const hasEnoughDataForBaseline = (signals: SignalEvent[]): { hasEnough: boolean; daysCollected: number } => {
  const daysCollected = countDaysOfData(signals);
  return {
    hasEnough: daysCollected >= 3,
    daysCollected,
  };
};

// ─── Build Usage Snapshots from Signals ───────────────────────

const buildSnapshotsFromSignals = (signals: SignalEvent[]): UsageSnapshot[] => {
  // Group signals into 2-hour windows
  const windowMs = 2 * 60 * 60 * 1000;
  const grouped: Map<number, SignalEvent[]> = new Map();

  for (const signal of signals) {
    const windowStart = Math.floor(signal.timestamp / windowMs) * windowMs;
    if (!grouped.has(windowStart)) {
      grouped.set(windowStart, []);
    }
    grouped.get(windowStart)!.push(signal);
  }

  const snapshots: UsageSnapshot[] = [];

  for (const [windowStart, windowSignals] of grouped) {
    const pickups = windowSignals.filter(s => s.type === 'pickup');
    const sessions = windowSignals.filter(s => s.type === 'session' && s.durationMs);
    const totalScreenTime = sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 60000; // minutes
    const hour = new Date(windowStart).getHours();
    const isLateNight = hour >= 23 || hour < 4;

    snapshots.push({
      timestamp: windowStart,
      totalScreenTime,
      appSwitchCount: pickups.length, // pickups approximate app switches
      sessionCount: sessions.length,
      pickupCount: pickups.length,
      lateNightUsage: isLateNight && (pickups.length > 0 || sessions.length > 0),
      timeBucket: getTimeBucketForHour(hour),
    });
  }

  return snapshots.sort((a, b) => a.timestamp - b.timestamp);
};

// ─── Compute Baseline ─────────────────────────────────────────

export const computeBaseline = (signals: SignalEvent[]): BaselineData => {
  const snapshots = buildSnapshotsFromSignals(signals);

  // Initialize bucket accumulators
  const bucketAccum: Record<TimeBucket, { screenTime: number[]; switches: number[]; sessions: number[] }> = {
    MORNING: { screenTime: [], switches: [], sessions: [] },
    AFTERNOON: { screenTime: [], switches: [], sessions: [] },
    EVENING: { screenTime: [], switches: [], sessions: [] },
    NIGHT: { screenTime: [], switches: [], sessions: [] },
  };

  for (const snap of snapshots) {
    const accum = bucketAccum[snap.timeBucket];
    accum.screenTime.push(snap.totalScreenTime);
    accum.switches.push(snap.appSwitchCount);
    accum.sessions.push(snap.sessionCount);
  }

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const buckets: Record<TimeBucket, BucketStats> = {} as any;
  for (const bucket of ['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'] as TimeBucket[]) {
    const accum = bucketAccum[bucket];
    buckets[bucket] = {
      avgScreenTime: avg(accum.screenTime),
      avgAppSwitches: avg(accum.switches),
      avgSocialTime: avg(accum.screenTime) * 0.4, // estimate 40% social
      avgSessionCount: avg(accum.sessions),
      sampleCount: accum.screenTime.length,
    };
  }

  // Overall daily averages
  const dailyTotals: Map<string, { screenTime: number; pickups: number; sessionDurations: number[] }> = new Map();
  for (const signal of signals) {
    const dateKey = new Date(signal.timestamp).toDateString();
    if (!dailyTotals.has(dateKey)) {
      dailyTotals.set(dateKey, { screenTime: 0, pickups: 0, sessionDurations: [] });
    }
    const day = dailyTotals.get(dateKey)!;
    if (signal.type === 'pickup') day.pickups++;
    if (signal.type === 'session' && signal.durationMs) {
      day.screenTime += signal.durationMs / 60000;
      day.sessionDurations.push(signal.durationMs / 60000);
    }
  }

  const dayValues = Array.from(dailyTotals.values());

  return {
    buckets,
    overall: {
      avgDailyScreenTime: avg(dayValues.map(d => d.screenTime)),
      avgDailyPickups: avg(dayValues.map(d => d.pickups)),
      avgSessionDuration: avg(dayValues.flatMap(d => d.sessionDurations)),
      avgStressScore: 30, // will be refined over time
    },
    computedAt: Date.now(),
    daysOfData: dailyTotals.size,
  };
};

// ─── Build and Save Baseline ──────────────────────────────────

export const buildAndSaveBaseline = async (): Promise<BaselineData | null> => {
  const signals = await loadSignals();
  const { hasEnough, daysCollected } = hasEnoughDataForBaseline(signals);

  useAuraStore.getState().setDaysOfData(daysCollected);

  if (!hasEnough) {
    return null;
  }

  const baseline = computeBaseline(signals);
  await saveBaseline(baseline);
  useAuraStore.getState().setBaseline(baseline);
  return baseline;
};

// ─── Get Current Usage Snapshot ───────────────────────────────

export const getCurrentSnapshot = (): UsageSnapshot => {
  const state = useAuraStore.getState();
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  const hourAgo = now - 60 * 60 * 1000;

  const recentSignals = state.signals.filter(s => s.timestamp >= twoHoursAgo);
  const pickups = recentSignals.filter(s => s.type === 'pickup');
  const sessions = recentSignals.filter(s => s.type === 'session' && s.durationMs);
  const totalScreenTime = sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / 60000;

  const hour = new Date().getHours();
  const isLateNight = hour >= 23 || hour < 4;

  return {
    timestamp: now,
    totalScreenTime,
    appSwitchCount: pickups.length,
    sessionCount: sessions.length,
    pickupCount: pickups.length,
    lateNightUsage: isLateNight && pickups.length > 0,
    timeBucket: getCurrentTimeBucket(),
  };
};
