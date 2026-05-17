export const Colors = {
  // Backgrounds — Light Lumina palette
  bg: '#f8fafc', // Very light blue-gray
  bgCard: 'rgba(255, 255, 255, 0.7)', // Translucent white for glass
  bgCardAlt: 'rgba(241, 245, 249, 0.7)',
  bgInput: 'rgba(255, 255, 255, 0.9)',
  bgElevated: 'rgba(255, 255, 255, 0.95)',
  bgBorder: 'rgba(0, 0, 0, 0.06)',

  // Accent — Calm Teal
  accent: '#2dd4bf', // Slightly darker teal for light mode contrast
  accentSoft: 'rgba(45, 212, 191, 0.15)',
  accentCyan: '#2dd4bf',
  accentDark: '#0f766e',

  // Text — Dark on Light
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textOnAccent: '#ffffff',

  // Status
  calm: '#2dd4bf',
  elevated: '#f97316', // Orange
  high: '#f43f5e', // Rose/Coral
  success: '#2dd4bf',
  warning: '#f97316',

  // Orb colors
  orbCalm: '#2dd4bf',
  orbElevated: '#f97316',
  orbHigh: '#f43f5e',

  // Tab bar
  tabActive: '#2dd4bf',
  tabInactive: '#94a3b8',
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
