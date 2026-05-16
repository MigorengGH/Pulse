export const Colors = {
  // Backgrounds — clean light palette
  bg: '#F5F7FA',
  bgCard: '#FFFFFF',
  bgCardAlt: '#EEF1F6',
  bgInput: '#EEF1F6',
  bgElevated: '#FFFFFF',
  bgBorder: '#E2E6EF',

  // Accent — Pulse cyan
  accent: '#00BFFF',
  accentSoft: 'rgba(0, 191, 255, 0.10)',
  accentCyan: '#00BFFF',
  accentDark: '#0099CC',

  // Text — dark on light
  textPrimary: '#0D1117',
  textSecondary: '#4A5568',
  textMuted: '#9BA3B2',
  textOnAccent: '#FFFFFF',

  // Status
  calm: '#10B981',
  elevated: '#F59E0B',
  high: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',

  // Orb colors
  orbCalm: '#10B981',
  orbElevated: '#F59E0B',
  orbHigh: '#EF4444',

  // Tab bar
  tabActive: '#00BFFF',
  tabInactive: '#9BA3B2',
} as const;

// Helper to get stress-based color
export const getStressColor = (score: number): string => {
  if (score <= 30) return Colors.calm;
  if (score <= 60) return Colors.elevated;
  return Colors.high;
};

// Helper to get stress label
export const getStressLabel = (score: number): string => {
  if (score <= 30) return 'Feeling calm';
  if (score <= 60) return 'Slightly elevated';
  return 'Higher than usual';
};

// Helper to get time greeting
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Late night';
};
