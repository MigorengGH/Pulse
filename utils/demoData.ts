import type { SignalEvent, BaselineData, BucketStats, TimeBucket, UsageSnapshot, NudgeRecord } from '../types';
import { useAuraStore } from '../store/useAuraStore';
import { saveSignals, saveBaseline, saveNudge } from '../lib/storage';
import { analyzeCurrentState } from '../lib/detector';
import { generateNudge } from '../lib/GeminiClient';

// ─── Helper: generate a timestamp for a specific day + hour ───
const dayTs = (daysAgo: number, hour: number, minute: number = 0): number => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
};

// ─── 1. MOCK SIGNALS: 7 days of realistic phone behavior ─────
export const generateMockSignals = (): SignalEvent[] => {
  const signals: SignalEvent[] = [];

  // Day patterns: [daysAgo, pickupCount, avgSessionMins, hasInsomnia]
  const dayPatterns: [number, number, number, boolean][] = [
    [6, 8, 12, false],   // Monday — moderate
    [5, 10, 15, false],  // Tuesday — moderate+
    [4, 7, 10, false],   // Wednesday — calm
    [3, 14, 25, false],  // Thursday — busy
    [2, 12, 20, true],   // Friday — busy + late night
    [1, 5, 8, false],    // Saturday — relaxed
    [0, 22, 35, true],   // TODAY — elevated stress (demo trigger!)
  ];

  for (const [daysAgo, pickupCount, avgSessionMins, hasInsomnia] of dayPatterns) {
    // Spread pickups across the day
    for (let i = 0; i < pickupCount; i++) {
      const hour = 7 + Math.floor((i / pickupCount) * 16); // 7am - 11pm
      const minute = Math.floor(Math.random() * 60);

      signals.push({
        timestamp: dayTs(daysAgo, hour, minute),
        type: 'pickup',
      });

      // Each pickup has a session
      const sessionDuration = (avgSessionMins + Math.floor(Math.random() * 10 - 5)) * 60 * 1000;
      signals.push({
        timestamp: dayTs(daysAgo, hour, minute) + 1000,
        type: 'session',
        durationMs: Math.max(sessionDuration, 60000),
      });
    }

    // Late night sessions for insomnia days
    if (hasInsomnia) {
      signals.push({
        timestamp: dayTs(daysAgo, 23, 45),
        type: 'pickup',
      });
      signals.push({
        timestamp: dayTs(daysAgo, 23, 45) + 1000,
        type: 'session',
        durationMs: 45 * 60 * 1000, // 45 min late night session
      });
      signals.push({
        timestamp: dayTs(daysAgo, 0, 30),
        type: 'insomnia',
      });
    }
  }

  // Extra signals for today (day 0) to make it clearly elevated
  // Rapid app switching in last 2 hours
  const now = Date.now();
  for (let i = 0; i < 15; i++) {
    const ts = now - (120 - i * 8) * 60 * 1000; // every ~8 minutes
    signals.push({ timestamp: ts, type: 'pickup' });
    signals.push({
      timestamp: ts + 500,
      type: 'session',
      durationMs: (3 + Math.floor(Math.random() * 5)) * 60 * 1000, // 3-8 min sessions
    });
  }

  return signals.sort((a, b) => a.timestamp - b.timestamp);
};

// ─── 2. MOCK BASELINE: computed from days 1-6 (not today) ────
export const generateMockBaseline = (signals: SignalEvent[]): BaselineData => {
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const pastSignals = signals.filter(s => s.timestamp < todayStart);

  // Compute realistic averages from 6 days
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const buckets: Record<TimeBucket, BucketStats> = {
    MORNING: {
      avgScreenTime: 25,
      avgAppSwitches: 4,
      avgSocialTime: 10,
      avgSessionCount: 3,
      sampleCount: 6,
    },
    AFTERNOON: {
      avgScreenTime: 35,
      avgAppSwitches: 5,
      avgSocialTime: 15,
      avgSessionCount: 4,
      sampleCount: 6,
    },
    EVENING: {
      avgScreenTime: 40,
      avgAppSwitches: 6,
      avgSocialTime: 18,
      avgSessionCount: 5,
      sampleCount: 6,
    },
    NIGHT: {
      avgScreenTime: 8,
      avgAppSwitches: 1,
      avgSocialTime: 3,
      avgSessionCount: 1,
      sampleCount: 3,
    },
  };

  return {
    buckets,
    overall: {
      avgDailyScreenTime: 120,     // 2 hours normal
      avgDailyPickups: 9,
      avgSessionDuration: 15,
      avgStressScore: 28,
    },
    computedAt: Date.now(),
    daysOfData: 6,
  };
};

// ─── 3. activateDemoMode() ────────────────────────────────────
export const activateDemoMode = async (): Promise<void> => {
  const store = useAuraStore.getState();

  // Generate mock data
  const signals = generateMockSignals();
  const baseline = generateMockBaseline(signals);

  // Load into store
  store.setSignals(signals);
  store.setBaseline(baseline);
  store.setDaysOfData(7);
  store.setOnboardingComplete(true);
  store.setInsomniaSignal(true);

  // Persist
  await saveSignals(signals);
  await saveBaseline(baseline);

  // Update computed stats
  const now = Date.now();
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const hourAgo = now - 60 * 60 * 1000;

  const pickupsToday = signals.filter(s => s.type === 'pickup' && s.timestamp >= todayStart).length;
  const pickupsLastHour = signals.filter(s => s.type === 'pickup' && s.timestamp >= hourAgo).length;
  const lastPickup = signals.filter(s => s.type === 'pickup').pop();
  store.setPickups(pickupsToday, pickupsLastHour, lastPickup?.timestamp || null);

  // Set elevated stress
  store.setStressScore(72);

  // Run deviation analysis — this should produce score > 60
  const analysis = await analyzeCurrentState();
  console.log('[DEMO] Deviation score:', analysis.deviationScore);
  console.log('[DEMO] Triggers:', analysis.triggers);
  console.log('[DEMO] Should nudge:', analysis.shouldNudge);

  // Generate and fire a Gemini nudge
  const nudgeMessage = await generateNudge(
    analysis.triggers.length > 0
      ? analysis.triggers
      : ['More app switching than usual', 'Higher screen time than your normal', 'Using phone during late night hours'],
    analysis.deviationScore > 0 ? analysis.deviationScore : 75
  );

  const nudge: NudgeRecord = {
    id: `demo-${Date.now()}`,
    message: nudgeMessage,
    triggers: analysis.triggers,
    timestamp: Date.now(),
    deviationScore: analysis.deviationScore || 75,
    wasActedOn: false,
  };

  store.addNudge(nudge);
  store.setLastNudgeTime(Date.now());
  store.setShowNudgeBanner(true);
  await saveNudge(nudge);

  console.log('[DEMO] Mode activated! Nudge:', nudgeMessage);
};
