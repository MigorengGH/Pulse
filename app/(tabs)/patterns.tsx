import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useAuraStore } from '../../store/useAuraStore';
import type { SignalEvent } from '../../types';
import { getInsight, generateWeeklyInsight } from '../../lib/GeminiClient';
import { loadCachedInsight, saveInsight } from '../../lib/storage';
import { Colors } from '../../constants/colors';

export default function PatternsScreen() {
  const store = useAuraStore();
  const [insight, setInsight] = useState<string>('Analyzing your patterns...');
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
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const daysAgo = 6 - i;
    const d = new Date(Date.now() - daysAgo * 86400000);
    const start = new Date(d).setHours(0, 0, 0, 0);
    const end = start + 86400000;
    const day = store.signals.filter(s => s.timestamp >= start && s.timestamp < end);
    const mins = Math.round(day.filter(s => s.type === 'session' && s.durationMs).reduce((a, s) => a + (s.durationMs || 0), 0) / 60000);
    const pickups = day.filter(s => s.type === 'pickup').length;
    const color = pickups > 15 ? Colors.high : pickups > 8 ? Colors.elevated : Colors.calm;
    return { value: mins, label: days[d.getDay()], frontColor: color };
  });

  // Weekly stats
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSignals = store.signals.filter(s => s.timestamp >= weekAgo);
  const weekPickups = weekSignals.filter(s => s.type === 'pickup').length;
  const weekScreenTimeMins = Math.round(weekSignals.filter(s => s.type === 'session' && s.durationMs).reduce((a, s) => a + (s.durationMs || 0), 0) / 60000);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: 64, paddingBottom: 40 }}>
      <Text style={{ color: Colors.textPrimary, fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 }}>
        This week
      </Text>
      <Text style={{ color: Colors.textMuted, fontSize: 14, marginBottom: 24 }}>
        Your phone usage patterns
      </Text>

      {/* Chart */}
      <View style={{
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 22,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}>
        <Text style={{ color: Colors.textPrimary, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
          Screen time (min)
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 16 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.calm }} /> Calm  
          {'  '}<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.elevated }} /> Elevated  
          {'  '}<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.high }} /> High
        </Text>
        <BarChart
          data={chartData}
          barWidth={24}
          spacing={14}
          roundedTop
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: Colors.textMuted, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 11 }}
          noOfSections={3}
          maxValue={300}
          initialSpacing={8}
          isAnimated
        />
      </View>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total pickups', value: weekPickups.toString() },
          { label: 'Screen time', value: weekScreenTimeMins >= 60 ? `${Math.floor(weekScreenTimeMins / 60)}h` : `${weekScreenTimeMins}m` },
          { label: 'Daily avg', value: Math.round(weekPickups / 7).toString() },
        ].map(stat => (
          <View key={stat.label} style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 18,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 6,
            elevation: 2,
          }}>
            <Text style={{ color: Colors.accent, fontSize: 22, fontWeight: '800', marginBottom: 4 }}>{stat.value}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: 'center' }}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Pulse's Daily Insight */}
      <View style={{
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 22,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: Colors.calm,
      }}>
        <Text style={{ color: Colors.calm, fontWeight: '700', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Pulse's Insight
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 15, lineHeight: 24 }}>{insight}</Text>
      </View>

      {/* Weekly Reflection */}
      <View style={{
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 22,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
      }}>
        <Text style={{ color: Colors.accent, fontWeight: '700', marginBottom: 10, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5 }}>
          Weekly Reflection
        </Text>
        {weeklyInsight ? (
          <Text style={{ color: Colors.textSecondary, fontSize: 15, lineHeight: 24 }}>{weeklyInsight}</Text>
        ) : (
          <Text style={{ color: Colors.textMuted, fontSize: 14, fontStyle: 'italic' }}>
            Tap below for a personalised weekly reflection
          </Text>
        )}
        <TouchableOpacity
          onPress={handleRefreshWeekly}
          disabled={isLoadingWeekly}
          style={{
            marginTop: 14,
            backgroundColor: Colors.accent,
            paddingVertical: 13,
            borderRadius: 12,
            alignItems: 'center',
            opacity: isLoadingWeekly ? 0.6 : 1,
          }}
        >
          {isLoadingWeekly
            ? <ActivityIndicator color="#FFF" size="small" />
            : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{weeklyInsight ? '↻ Refresh' : '✨ Generate Reflection'}</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Demo button (dev only) */}
      {__DEV__ && (
        <TouchableOpacity
          style={{ backgroundColor: Colors.bgCardAlt, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 }}
          onPress={loadDemoData}
        >
          <Text style={{ color: Colors.textMuted, fontWeight: '600' }}>⚙️ Load Demo Week</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
