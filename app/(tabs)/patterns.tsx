import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { BlurView } from 'expo-blur';
import { useAuraStore } from '../../store/useAuraStore';
import type { SignalEvent } from '../../types';
import { getInsight, generateWeeklyInsight } from '../../lib/GeminiClient';
import { loadCachedInsight, saveInsight, saveSignals, loadSignals, loadBaseline, saveBaseline } from '../../lib/storage';
import { buildAndSaveBaseline } from '../../lib/baseline';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

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

  const loadDemoData = async () => {
    if (store.isDemoMode) return;

    // 1. Back up current signals and baseline to storage
    try {
      const currentSignals = await loadSignals();
      await AsyncStorage.setItem('aura_signals_backup', JSON.stringify(currentSignals));
      
      const baseline = store.baseline || await loadBaseline();
      if (baseline) {
        await AsyncStorage.setItem('aura_baseline_backup', JSON.stringify(baseline));
      }
    } catch (e) {
      console.error('Failed to create backup for demo mode', e);
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const demoSignals: SignalEvent[] = [];

    const dayPatterns: [number, number, number][] = [
      [6, 8, 12], [5, 10, 15], [4, 7, 10],
      [3, 14, 25], [2, 12, 20], [1, 5, 8], [0, 22, 35],
    ];

    for (const [daysAgo, count, avgMins] of dayPatterns) {
      const startOfDay = new Date(now - daysAgo * dayMs).setHours(0, 0, 0, 0);
      const spanMs = daysAgo === 0 
        ? (now - startOfDay) // for today, only generate up to the current hour to avoid future timestamps
        : 24 * 60 * 60 * 1000; // for past days, distribute over the entire 24h

      for (let i = 0; i < count; i++) {
        // Distribute signals evenly across the available span of the day
        const ts = startOfDay + (i * spanMs / count) + Math.floor(Math.random() * (spanMs / (count * 2)));
        demoSignals.push({ timestamp: ts, type: 'pickup' });
        demoSignals.push({ timestamp: ts + 1000, type: 'session', durationMs: avgMins * 60 * 1000 });
      }
    }

    // Add realistic sleep cycle insomnia signals so the dynamic alerts trigger
    demoSignals.push({ timestamp: now - 3 * dayMs - 2 * 3600000, type: 'insomnia' });
    demoSignals.push({ timestamp: now - 1 * dayMs - 1 * 3600000, type: 'insomnia' });

    store.setIsDemoMode(true);
    store.setSignals(demoSignals);
    store.setDaysOfData(7);
    
    // Save these signals to disk and force build the baseline!
    await saveSignals(demoSignals);
    await buildAndSaveBaseline();
    
    // Inject active triggers into store so dashboard reflects the newly loaded signals
    useAuraStore.setState({
      insomniaSignal: true,
      stressScore: 58,
      lastAnalysis: {
        score: 58,
        deviationScore: 58,
        triggers: [
          'Late night scrolling while still (in-bed scrolling)',
          'Frequent phone pickup habit during sleep hours'
        ]
      } as any
    });

    // Automatically trigger a refresh on AI Analysis
    const fetchNewInsight = async () => {
      const text = await getInsight();
      setInsight(text);
      saveInsight(text);
    };
    fetchNewInsight();

    Alert.alert(
      "Demo Week Loaded! 📊",
      "7 days of realistic screen activity, frantic late-night scroll patterns, and sleep-cycle disruptions have been loaded. You are now in persistent Demo Mode!"
    );
  };

  const exitDemoMode = async () => {
    setIsLoadingWeekly(true);
    try {
      // 1. Load backup signals and baseline from storage
      const backupSignalsData = await AsyncStorage.getItem('aura_signals_backup');
      const backupBaselineData = await AsyncStorage.getItem('aura_baseline_backup');

      let restoredSignals: SignalEvent[] = [];
      if (backupSignalsData) {
        restoredSignals = JSON.parse(backupSignalsData);
      }

      // 2. Set Demo Mode to false
      store.setIsDemoMode(false);
      
      // 3. Save restored signals back to main storage
      await saveSignals(restoredSignals);
      store.setSignals(restoredSignals);
      store.setDaysOfData(restoredSignals.length > 0 ? 7 : 0);

      // 4. Restore baseline
      if (backupBaselineData) {
        const restoredBaseline = JSON.parse(backupBaselineData);
        store.setBaseline(restoredBaseline);
        await saveBaseline(restoredBaseline);
      } else {
        store.setBaseline(null);
        await AsyncStorage.removeItem('aura_baseline');
      }

      // 5. Reset stress and triggers to clean baseline outcomes
      useAuraStore.setState({
        stressScore: 30,
        insomniaSignal: false,
        lastAnalysis: {
          score: 30,
          deviationScore: 0,
          triggers: []
        } as any
      });

      // 6. Refresh AI Analysis and Weekly Reflection back to normal
      const text = await getInsight();
      setInsight(text);
      saveInsight(text);
      setWeeklyInsight(null);

      // 7. Clean up backup keys
      await AsyncStorage.removeItem('aura_signals_backup');
      await AsyncStorage.removeItem('aura_baseline_backup');

      Alert.alert(
        "Demo Mode Exited! 🧘",
        "Your original behavioral trends, screen pickups, and baseline stats have been fully restored."
      );
    } catch (e) {
      console.error('Failed to exit demo mode', e);
      Alert.alert("Error", "Failed to restore previous state.");
    } finally {
      setIsLoadingWeekly(false);
    }
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

  // Dynamic Live Statistics
  const pickupsRate = useMemo(() => {
    const hours = Math.max(1, new Date().getHours());
    const avg = store.pickupsToday / hours;
    return avg > 0 ? avg.toFixed(1) : "0.0";
  }, [store.pickupsToday]);

  const pickupsDiff = useMemo(() => {
    const diff = store.pickupsLastHour - 3; // Baseline reference compared to calm state
    return diff >= 0 ? `+${diff}` : `${diff}`;
  }, [store.pickupsLastHour]);

  const totalScreenTime = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const sessions = store.signals.filter(s => s.type === 'session' && s.timestamp > today && s.durationMs);
    let totalMs = sessions.reduce((a, s) => a + (s.durationMs || 0), 0);

    if (store.currentSessionStart) {
      totalMs += Date.now() - store.currentSessionStart;
    }

    const secs = Math.round(totalMs / 1000);
    const mins = Math.floor(secs / 60);
    if (store.isDemoMode && secs < 60) {
      return `${secs}s`;
    }
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }, [store.signals, store.currentSessionStart, store.isDemoMode]);

  // Weekly stats — memoized to avoid re-filtering the full signal array on every render
  const { weekPickups, weekScreenTimeMins } = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const weekSignals = store.signals.filter(s => s.timestamp >= weekAgo);
    return {
      weekPickups: weekSignals.filter(s => s.type === 'pickup').length,
      weekScreenTimeMins: Math.round(
        weekSignals
          .filter(s => s.type === 'session' && s.durationMs)
          .reduce((a, s) => a + (s.durationMs || 0), 0) / 60000
      ),
    };
  }, [store.signals]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerText}>Daily Rhythm</Text>
        <Text style={styles.subHeaderText}>Comparing today to your 3-day baseline.</Text>

        {store.isDemoMode && (
          <View style={{ 
            backgroundColor: 'rgba(45, 212, 191, 0.08)', 
            borderColor: 'rgba(45, 212, 191, 0.2)', 
            borderWidth: 1, 
            borderRadius: 16, 
            padding: 16, 
            marginBottom: 20, 
            flexDirection: 'row', 
            alignItems: 'center', 
            gap: 12 
          }}>
            <Ionicons name="sparkles" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.textPrimary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 }}>
                ✨ Persistent Demo Mode Active
              </Text>
              <Text style={{ color: Colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, marginTop: 2 }}>
                Simulating realistic sleep disruptions and in-bed screen activity.
              </Text>
            </View>
            <TouchableOpacity 
              onPress={exitDemoMode}
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.15)',
              }}
            >
              <Text style={{ color: '#EF4444', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11 }}>Exit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usage Trends Chart (MOVED UP) */}
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

        {/* Quick Stats Row (LIVE & DYNAMIC) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
          <GlassCard style={{ flex: 1, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="phone-portrait-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ color: Colors.textSecondary, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>Pickups/hr</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 40 }}>{pickupsRate}</Text>
              <Text style={{ color: pickupsDiff.startsWith('+') ? Colors.high : Colors.accent, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', marginLeft: 6, marginBottom: 4 }}>{pickupsDiff}</Text>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 }}>
              {parseFloat(pickupsRate) > 4 ? "Elevated device check rate." : "Gentler pace than usual today."}
            </Text>
          </GlassCard>

          <GlassCard style={{ flex: 1, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ color: Colors.textSecondary, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1 }}>Screen Time</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', lineHeight: 40 }}>{totalScreenTime}</Text>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 }}>In rhythm with your baseline.</Text>
          </GlassCard>
        </View>

        {/* Active Signals (LIVE & DYNAMIC) */}
        <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 8 }}>
          Active Signals
        </Text>
        <View style={[{
          borderRadius: 24,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: Colors.bgBorder,
          marginBottom: 32,
        }]}>
          <BlurView intensity={50} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
            {/* Stillness Item */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.bgBorder }}>
              <View style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 22, 
                backgroundColor: store.movementState === 'still' ? 'rgba(45, 212, 191, 0.15)' : 'rgba(99, 102, 241, 0.15)', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: 16 
              }}>
                <Ionicons 
                  name={store.movementState === 'still' ? "bed-outline" : "walk-outline"} 
                  size={20} 
                  color={store.movementState === 'still' ? Colors.accent : '#6366f1'} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: Colors.textPrimary, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 }}>Stillness Tracker</Text>
                <Text style={{ color: store.movementState === 'still' ? Colors.accent : '#6366f1', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                  {store.movementState === 'still' ? 'Complete Stillness (In Bed)' : 'Physical Movement Detected'}
                </Text>
              </View>
              <Ionicons name="cellular" size={24} color={Colors.accent} style={{ opacity: 0.6 }} />
            </View>
            
            {/* Insomnia Signal Item */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 20 }}>
              <View style={{ 
                width: 44, 
                height: 44, 
                borderRadius: 22, 
                backgroundColor: store.insomniaSignal ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.04)', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: 16 
              }}>
                <Ionicons 
                  name={store.insomniaSignal ? "warning-outline" : "moon-outline"} 
                  size={22} 
                  color={store.insomniaSignal ? '#EF4444' : Colors.textMuted} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: store.insomniaSignal ? Colors.high : Colors.textMuted, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 2 }}>Insomnia Signal</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>
                  {store.insomniaSignal ? '⚠️ Sleep cycle disrupted' : 'Resting steady and quiet'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Overall Flow Chart (MOVED DOWN) */}
        <GlassCard style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              Overall Flow
            </Text>
            <Ionicons name="water-outline" size={20} color={Colors.accent} />
          </View>
          
          <View style={{ height: 120, justifyContent: 'center', marginLeft: -10 }}>
            <Text style={{ position: 'absolute', top: -5, left: '35%', color: Colors.accent, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, zIndex: 10 }}>Peak Flow</Text>
            <LineChart
              data={[{value: 20}, {value: 30}, {value: 45}, {value: 50}, {value: 45}, {value: 25}, {value: 20}, {value: 25}, {value: 30}]}
              data2={[{value: 15}, {value: 15}, {value: 20}, {value: 30}, {value: 40}, {value: 45}, {value: 30}, {value: 15}, {value: 15}]}
              curved
              hideDataPoints
              hideRules
              hideYAxisText
              hideAxesAndRules
              thickness={5}
              color={Colors.accent}
              color2={Colors.textMuted}
              strokeDashArray2={[5, 5]}
              thickness2={4}
              areaChart
              startFillColor={Colors.accent}
              endFillColor={'transparent'}
              startOpacity={0.15}
              endOpacity={0.0}
              height={80}
              adjustToWidth
            />
            <Text style={{ position: 'absolute', bottom: 5, right: 30, color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, zIndex: 10 }}>Resting</Text>
          </View>
        </GlassCard>

        {/* AI Analysis */}
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

        {/* Weekly Reflection */}
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
          store.isDemoMode ? (
            <TouchableOpacity 
              style={[styles.demoButton, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1 }]} 
              onPress={exitDemoMode}
            >
              <Ionicons name="exit-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.demoButtonText, { color: '#EF4444' }]}>Exit Demo Mode</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.demoButton} onPress={loadDemoData}>
              <Ionicons name="construct" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
              <Text style={styles.demoButtonText}>Load Demo Week</Text>
            </TouchableOpacity>
          )
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
