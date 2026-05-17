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

  // 6. Unusually long session duration (avoidance or flow) (+20)
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  const recentSessions = state.signals.filter(s => s.type === 'session' && s.durationMs && s.timestamp >= twoHoursAgo);
  const longSessionThresholdMs = 45 * 60 * 1000; // 45 minutes
  const avgSessionMs = (baseline.overall.avgSessionDuration || 15) * 60 * 1000;
  const dynamicThresholdMs = Math.max(longSessionThresholdMs, avgSessionMs * 2);

  const hasLongSession = recentSessions.some(s => (s.durationMs || 0) > dynamicThresholdMs);
  if (hasLongSession) {
    score += 20;
    triggers.push('Unusually long phone session (avoidance or flow)');
  }

  // 7. Rapid phone checking (restlessness) (+15)
  const hourAgo = now - 60 * 60 * 1000;
  const pickupsLastHour = state.signals.filter(s => s.type === 'pickup' && s.timestamp >= hourAgo).length;
  if (pickupsLastHour > 10) {
    score += 15;
    triggers.push('Rapid phone checking (restlessness)');
  }

  const pickupsLastMinute = state.signals.filter(s => s.type === 'pickup' && s.timestamp >= now - 60 * 1000).length;

  // 7b. Pickups = 5 (labeled as stress) (+15)
  if (pickupsLastMinute >= 5 || state.pickupsLastHour >= 5) {
    score += 15;
    triggers.push('Elevated checks rate (5+ pickups per min/hour) - Labeled as Stress');
  }

  // 8. Still and scrolling late at night (in-bed scrolling) (+15)
  if (timeBucket === 'NIGHT' && state.movementState === 'still') {
    score += 15;
    triggers.push('Late night scrolling while still (in-bed scrolling)');
  }

  // 9. Multiple ignored notifications (withdrawal/avoidance) (+15)
  if (state.ignoredNotificationsCount >= 3) {
    score += 15;
    triggers.push('Multiple ignored notifications (withdrawal/avoidance)');
  }

  // 10. Charging late night and playing phone constantly (+20)
  const hourNum = new Date(now).getHours();
  const isLateNightHour = hourNum >= 23 || hourNum < 5;
  let curSessionMins = 0;
  if (state.currentSessionStart) {
    curSessionMins = (now - state.currentSessionStart) / (1000 * 60);
  }
  const constantPlayThresholdMins = state.isDemoMode ? (15 / 60) : 15; // 15 seconds in demo mode, 15 minutes in real life
  const playingConstantly = curSessionMins >= constantPlayThresholdMins || state.pickupsLastHour >= 5 || pickupsLastMinute >= 5;
  if (state.isCharging && isLateNightHour && playingConstantly) {
    score += 20;
    triggers.push('Playing phone constantly while charging late at night (High Stress)');
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
