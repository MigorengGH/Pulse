import type { AnalysisResult } from '../types';
import { useAuraStore } from '../store/useAuraStore';
import { getCurrentSnapshot, getCurrentTimeBucket } from './baseline';
import { loadBaseline } from './storage';

// ─── Analyze Current State vs Baseline ────────────────────────

export const analyzeCurrentState = async (): Promise<AnalysisResult> => {
  const snapshot = getCurrentSnapshot();
  const baseline = useAuraStore.getState().baseline || await loadBaseline();
  const timeBucket = getCurrentTimeBucket();

  // If no baseline yet, return a neutral result
  if (!baseline) {
    return {
      deviationScore: 0,
      triggers: [],
      shouldNudge: false,
      currentSnapshot: snapshot,
      timeBucket,
    };
  }

  const bucketBaseline = baseline.buckets[timeBucket];
  const triggers: string[] = [];
  let score = 0;

  // ─── Deviation Scoring Rules ──────────────────────────────

  // 1. App switch frequency > 150% of baseline (+30)
  if (bucketBaseline.avgAppSwitches > 0 && 
      snapshot.appSwitchCount > bucketBaseline.avgAppSwitches * 1.5) {
    score += 30;
    triggers.push('More app switching than usual');
  }

  // 2. Screen time > 150% of baseline (+20)
  if (bucketBaseline.avgScreenTime > 0 && 
      snapshot.totalScreenTime > bucketBaseline.avgScreenTime * 1.5) {
    score += 20;
    triggers.push('Higher screen time than your normal');
  }

  // 3. Session count > 200% of baseline (+15)
  if (bucketBaseline.avgSessionCount > 0 && 
      snapshot.sessionCount > bucketBaseline.avgSessionCount * 2) {
    score += 15;
    triggers.push('Picking up the phone more frequently');
  }

  // 4. Late night usage (+25)
  if (snapshot.lateNightUsage) {
    score += 25;
    triggers.push('Using phone during late night hours');
  }

  // 5. Insomnia signal from store (+10)
  const state = useAuraStore.getState();
  if (state.insomniaSignal) {
    score += 10;
    triggers.push('Phone active while charging late at night');
  }

  // Cap at 100
  score = Math.min(100, score);

  // Should nudge if score > 50 and nudges are enabled
  const prefs = state.preferences;
  const hour = new Date().getHours();
  const inQuietHours = prefs.quietHoursStart <= prefs.quietHoursEnd
    ? (hour >= prefs.quietHoursStart && hour < prefs.quietHoursEnd)
    : (hour >= prefs.quietHoursStart || hour < prefs.quietHoursEnd);

  const shouldNudge = 
    score > 50 && 
    prefs.nudgesEnabled && 
    !inQuietHours;

  const result: AnalysisResult = {
    deviationScore: score,
    triggers,
    shouldNudge,
    currentSnapshot: snapshot,
    timeBucket,
  };

  // Update store
  useAuraStore.getState().setDeviationScore(score);
  useAuraStore.getState().setLastAnalysis(result);

  return result;
};
