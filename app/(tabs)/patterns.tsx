import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { BlurView } from 'expo-blur';
import { useAuraStore } from '../../store/useAuraStore';
import type { SignalEvent } from '../../types';
import { getInsight, generateWeeklyInsight } from '../../lib/GeminiClient';
import { loadCachedInsight, saveInsight } from '../../lib/storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import BaselineProgress from '../../components/BaselineProgress';

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 16,
      elevation: 2,
    }, style]}>
      <BlurView intensity={50} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 24 }}>
        {children}
      </View>
    </View>
  );
}

export default function PatternsScreen() {
  const store = useAuraStore();
  const [insight, setInsight] = useState<string>('Analyzing your unique behavioral patterns...');
  const [weeklyInsight, setWeeklyInsight] = useState<string | null>(null);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

  useEffect(() => {
    const fetchInsight = async () => {
      const cached = await loadCachedInsight();
      if (cached) setInsight(cached);
      else {
        const text = await getInsight();
        setInsight(text);
        saveInsight(text);
      }
    };
    fetchInsight();
  }, [store.signals]);

  const handleRefreshWeekly = async () => {
    setIsLoadingWeekly(true);
    const text = await generateWeeklyInsight();
    setWeeklyInsight(text);
    setIsLoadingWeekly(false);
  };

  const loadDemoData = () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const demoSignals: SignalEvent[] = [];

    const dayPatterns: [number, number, number][] = [
      [6, 8, 12], [5, 10, 15], [4, 7, 10],
      [3, 14, 25], [2, 12, 20], [1, 5, 8], [0, 22, 35],
    ];

    for (const [daysAgo, count, avgMins] of dayPatterns) {
      const base = now - daysAgo * dayMs;
      for (let i = 0; i < count; i++) {
        const ts = base + i * 3600000 + Math.floor(Math.random() * 3600000);
        demoSignals.push({ timestamp: ts, type: 'pickup' });
        demoSignals.push({ timestamp: ts + 1000, type: 'session', durationMs: avgMins * 60 * 1000 });
      }
    }

    store.setSignals(demoSignals);
    store.setDaysOfData(7);
  };

  // Chart data
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const chartData = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    const d = new Date(Date.now() - daysAgo * 86400000);
    const start = new Date(d).setHours(0, 0, 0, 0);
    const end = start + 86400000;
    const day = store.signals.filter(s => s.timestamp >= start && s.timestamp < end);
    const mins = Math.round(day.filter(s => s.type === 'session' && s.durationMs).reduce((a, s) => a + (s.durationMs || 0), 0) / 60000);
    const pickups = day.filter(s => s.type === 'pickup').length;
    const color = pickups > 15 ? Colors.high : pickups > 8 ? Colors.elevated : Colors.calm;
    return { value: mins, label: days[d.getDay()], frontColor: color };
  }), [store.signals]);

  // Weekly stats
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSignals = store.signals.filter(s => s.timestamp >= weekAgo);
  const weekPickups = weekSignals.filter(s => s.type === 'pickup').length;
  const weekScreenTimeMins = Math.round(weekSignals.filter(s => s.type === 'session' && s.durationMs).reduce((a, s) => a + (s.durationMs || 0), 0) / 60000);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerText}>Journey</Text>
        <Text style={styles.subHeaderText}>Your behavioral baselines & patterns</Text>

        {/* Journey & Baselines */}
        <GlassCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={styles.iconContainer}>
              <Ionicons name="flag" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Baseline Progression</Text>
          </View>
          
          <BaselineProgress daysCollected={store.daysOfData} />
          
          <Text style={styles.baselineDescription}>
            {store.baseline 
              ? "Your baseline is fully established. Aura is now capable of detecting subtle behavioral shifts."
              : `Collecting data to establish your unique digital rhythm. ${Math.max(0, 7 - store.daysOfData)} days remaining.`}
          </Text>

          <View style={styles.divider} />
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{weekPickups}</Text>
              <Text style={styles.statLabel}>Pickups (Week)</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {weekScreenTimeMins >= 60 ? `${Math.floor(weekScreenTimeMins / 60)}h ${weekScreenTimeMins % 60}m` : `${weekScreenTimeMins}m`}
              </Text>
              <Text style={styles.statLabel}>Screen Time</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{Math.round(weekPickups / 7)}</Text>
              <Text style={styles.statLabel}>Daily Avg</Text>
            </View>
          </View>
        </GlassCard>

        {/* Signal Insights */}
        <Text style={[styles.headerText, { fontSize: 24, marginTop: 12 }]}>Signal Insights</Text>
        <Text style={styles.subHeaderText}>Analysis of your device interactions</Text>

        <GlassCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                <Ionicons name="analytics" size={18} color={Colors.elevated} />
              </View>
              <Text style={styles.sectionTitle}>Usage Trends</Text>
            </View>
            <Text style={{ fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, color: Colors.textMuted }}>LAST 7 DAYS</Text>
          </View>

          <BarChart
            data={chartData}
            barWidth={22}
            spacing={16}
            roundedTop
            hideRules
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10, fontFamily: 'PlusJakartaSans_500Medium' }}
            xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}
            noOfSections={3}
            maxValue={Math.max(...chartData.map(d => d.value), 100)}
            initialSpacing={4}
            isAnimated
          />
          
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.calm }]} /><Text style={styles.legendText}>Calm</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.elevated }]} /><Text style={styles.legendText}>Elevated</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.high }]} /><Text style={styles.legendText}>High</Text></View>
          </View>
        </GlassCard>

        <GlassCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
             <View style={[styles.iconContainer, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
              <Ionicons name="sparkles" size={18} color={Colors.high} />
            </View>
            <Text style={styles.sectionTitle}>AI Analysis</Text>
          </View>
          <Text style={styles.insightText}>{insight}</Text>

          {store.lastAnalysis && store.lastAnalysis.triggers.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={styles.triggerLabel}>DETECTED TRIGGERS:</Text>
              <View style={styles.triggerContainer}>
                {store.lastAnalysis.triggers.map((trigger, i) => (
                  <View key={i} style={styles.triggerBadge}>
                    <Text style={styles.triggerText}>{trigger}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </GlassCard>

        <GlassCard style={{ marginBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(45, 212, 191, 0.15)' }]}>
              <Ionicons name="leaf" size={18} color={Colors.accent} />
            </View>
            <Text style={styles.sectionTitle}>Weekly Reflection</Text>
          </View>
          
          {weeklyInsight ? (
            <Text style={styles.insightText}>{weeklyInsight}</Text>
          ) : (
            <Text style={[styles.insightText, { color: Colors.textMuted, fontStyle: 'italic' }]}>
              Generate a personalized reflection based on this week's signal data.
            </Text>
          )}
          
          <TouchableOpacity
            onPress={handleRefreshWeekly}
            disabled={isLoadingWeekly}
            style={[styles.button, isLoadingWeekly && styles.buttonDisabled]}
          >
            {isLoadingWeekly ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name={weeklyInsight ? "refresh-outline" : "sparkles"} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>
                  {weeklyInsight ? 'Refresh Reflection' : 'Generate Reflection'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* Demo button (dev only) */}
        {__DEV__ && (
          <TouchableOpacity style={styles.demoButton} onPress={loadDemoData}>
            <Ionicons name="construct" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <Text style={styles.demoButtonText}>Load Demo Week</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerText: {
    color: Colors.textPrimary,
    fontSize: 32,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subHeaderText: {
    color: Colors.textMuted,
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  baselineDescription: {
    color: Colors.textMuted,
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    marginTop: 16,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.bgBorder,
    marginVertical: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    marginBottom: 4,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'uppercase',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  insightText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    lineHeight: 24,
  },
  triggerLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  triggerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  triggerBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  triggerText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  button: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
  },
  demoButton: {
    backgroundColor: Colors.bgCardAlt,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  demoButtonText: {
    color: Colors.textMuted,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
