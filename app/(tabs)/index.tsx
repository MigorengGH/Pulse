import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import Orb from '../../components/Orb';
import DeviationRing from '../../components/DeviationRing';
import BaselineProgress from '../../components/BaselineProgress';
import { useAuraStore } from '../../store/useAuraStore';
import { Colors, getGreeting, getStressLabel, getStressColor } from '../../constants/colors';

export default function Home() {
  const state = useAuraStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const label = useMemo(() => getStressLabel(state.stressScore), [state.stressScore]);
  const greeting = useMemo(() => getGreeting(), []);
  const stressColor = useMemo(() => getStressColor(state.stressScore), [state.stressScore]);

  const totalScreenTime = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const sessions = state.signals.filter(s => s.type === 'session' && s.timestamp > today && s.durationMs);
    const totalMs = sessions.reduce((a, s) => a + (s.durationMs || 0), 0);
    const mins = Math.round(totalMs / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }, [state.signals]);

  const lastNudge = state.nudgeHistory[0];
  const lastNudgeAge = lastNudge
    ? (() => {
        const mins = Math.round((Date.now() - lastNudge.timestamp) / 60000);
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
        return `${Math.round(mins / 1440)}d ago`;
      })()
    : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 64, paddingBottom: 8 }}>
          <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
          <Text style={{ color: Colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }}>
            {greeting} 👋
          </Text>
        </View>

        {/* Status Card */}
        <View style={{
          marginHorizontal: 16,
          marginTop: 20,
          backgroundColor: Colors.bgCard,
          borderRadius: 24,
          padding: 28,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}>
          {state.baseline ? (
            <>
              <DeviationRing score={state.deviationScore || state.stressScore} size={160} strokeWidth={8} />
              <Text style={{ color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16 }}>
                {label}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Based on your personal baseline
              </Text>
            </>
          ) : (
            <>
              <Orb stressScore={state.stressScore} />
              <Text style={{ color: Colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 16 }}>
                {label}
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                Pulse observes passively — no check-ins
              </Text>
            </>
          )}
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 }}>
          <StatCard icon="📱" label="Pickups" value={state.pickupsToday.toString()} />
          <StatCard icon="⏱️" label="Screen time" value={totalScreenTime} />
          <StatCard icon="🌙" label="Sleep" value={state.insomniaSignal ? 'Late' : 'Good'} />
        </View>

        {/* Baseline Progress */}
        {!state.baseline && (
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <BaselineProgress daysCollected={state.daysOfData} />
          </View>
        )}

        {/* Last Nudge */}
        {lastNudge && (
          <View style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: Colors.bgCard,
            borderRadius: 20,
            padding: 20,
            borderLeftWidth: 3,
            borderLeftColor: Colors.accent,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                Last nudge
              </Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{lastNudgeAge}</Text>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              {lastNudge.message}
            </Text>
          </View>
        )}

        {/* Active Signals */}
        {state.lastAnalysis && state.lastAnalysis.triggers.length > 0 && (
          <View style={{
            marginHorizontal: 16,
            marginTop: 16,
            backgroundColor: Colors.bgCard,
            borderRadius: 20,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Active signals
            </Text>
            {state.lastAnalysis.triggers.map((trigger, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.elevated, marginRight: 10 }} />
                <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>{trigger}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer note */}
        <Text style={{ color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 24, paddingHorizontal: 40, lineHeight: 18 }}>
          Pulse monitors passively in the background. Your data never leaves your device.
        </Text>

      </Animated.View>
    </ScrollView>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{
      flex: 1,
      backgroundColor: Colors.bgCard,
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    }}>
      <Text style={{ fontSize: 20, marginBottom: 6 }}>{icon}</Text>
      <Text style={{ color: Colors.textPrimary, fontSize: 17, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}
