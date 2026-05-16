// ─── Signal Types ─────────────────────────────────────────────

export interface SignalEvent {
  timestamp: number;
  type: 'pickup' | 'session' | 'insomnia' | 'still' | 'moving';
  durationMs?: number;
}

// ─── Time Buckets ─────────────────────────────────────────────

export type TimeBucket = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';

export interface BucketStats {
  avgScreenTime: number;     // minutes
  avgAppSwitches: number;
  avgSocialTime: number;     // minutes
  avgSessionCount: number;
  sampleCount: number;       // how many snapshots went into this average
}

// ─── Baseline ─────────────────────────────────────────────────

export interface BaselineData {
  buckets: Record<TimeBucket, BucketStats>;
  overall: {
    avgDailyScreenTime: number;    // minutes
    avgDailyPickups: number;
    avgSessionDuration: number;    // minutes
    avgStressScore: number;
  };
  computedAt: number;              // timestamp
  daysOfData: number;
}

// ─── Usage Snapshot ───────────────────────────────────────────

export interface UsageSnapshot {
  timestamp: number;
  totalScreenTime: number;         // minutes
  appSwitchCount: number;
  sessionCount: number;
  pickupCount: number;
  lateNightUsage: boolean;
  timeBucket: TimeBucket;
}

// ─── Deviation / Analysis ─────────────────────────────────────

export interface AnalysisResult {
  deviationScore: number;          // 0-100
  triggers: string[];              // which signals fired
  shouldNudge: boolean;
  currentSnapshot: UsageSnapshot;
  timeBucket: TimeBucket;
}

// ─── Nudge ────────────────────────────────────────────────────

export interface NudgeRecord {
  id: string;
  message: string;
  triggers: string[];
  timestamp: number;
  deviationScore: number;
  wasActedOn: boolean;
}

// ─── Settings / Preferences ──────────────────────────────────

export interface UserPreferences {
  nudgesEnabled: boolean;
  lateNightMode: boolean;         // extra sensitivity after 11pm
  quietHoursStart: number;        // hour (0-23), default 0
  quietHoursEnd: number;          // hour (0-23), default 7
}
