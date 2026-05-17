import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, Animated, Dimensions } from 'react-native';
import Orb from '../../components/Orb';
import BaselineProgress from '../../components/BaselineProgress';
import { useAuraStore } from '../../store/useAuraStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getGreeting, getStressLabel, getStressColor } from '../../constants/colors';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Home() {
  const state = useAuraStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
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
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Background Mesh Gradient Simulation */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0', '#f8fafc']}
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={{ paddingHorizontal: 24, paddingTop: 70, paddingBottom: 8 }}>
            <Text style={{ 
              color: Colors.textMuted, 
              fontSize: 12, 
              fontFamily: 'PlusJakartaSans_600SemiBold', 
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginBottom: 6 
            }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={{ 
              color: Colors.textPrimary, 
              fontSize: 32, 
              fontFamily: 'PlusJakartaSans_800ExtraBold', 
              letterSpacing: -0.5 
            }}>
              {greeting}
            </Text>
          </View>

          {/* Main Status Area */}
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View style={{ paddingVertical: 20 }}>
              <Orb stressScore={state.baseline ? (state.deviationScore || state.stressScore) : state.stressScore} />
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                 <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                  {state.baseline ? 'Current State' : 'Aura Pulse'}
                </Text>
                <Text style={{ color: Colors.textPrimary, fontSize: 26, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 4 }}>
                  {label}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginTop: 32, gap: 12 }}>
            <StatCard iconName="phone-portrait-outline" label="Pickups" value={state.pickupsToday.toString()} />
            <StatCard iconName="time-outline" label="Focus" value={totalScreenTime} />
            <StatCard iconName="moon-outline" label="Rest" value={state.insomniaSignal ? 'Late' : 'Steady'} />
          </View>

          {/* Baseline Progress */}
          {!state.baseline && (
            <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
               <GlassCard>
                <View style={{ padding: 24 }}>
                  <Text style={{ color: Colors.textPrimary, fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 12 }}>
                    Baseline Collection
                  </Text>
                  <BaselineProgress daysCollected={state.daysOfData} />
                  <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 12, lineHeight: 18 }}>
                    Aura is learning your unique behavioral patterns. Your baseline will be ready in {Math.max(0, 7 - state.daysOfData)} days.
                  </Text>
                </View>
              </GlassCard>
            </View>
          )}

          {/* Last Nudge / Insights */}
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <GlassCard>
              <View style={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ color: Colors.accent, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    AI COMPANION
                  </Text>
                  {lastNudgeAge && <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' }}>{lastNudgeAge}</Text>}
                </View>
                
                <Text style={{ color: Colors.textPrimary, fontSize: 17, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 26, marginBottom: 16 }}>
                  {lastNudge ? lastNudge.message : "Aura is currently observing your digital rhythm to provide contextual mindfulness nudges."}
                </Text>

                {state.lastAnalysis && state.lastAnalysis.triggers.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {state.lastAnalysis.triggers.map((trigger, i) => (
                      <View key={i} style={{ 
                        backgroundColor: 'rgba(0,0,0,0.05)', 
                        paddingHorizontal: 12, 
                        paddingVertical: 6, 
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(0,0,0,0.08)'
                      }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                          {trigger}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </GlassCard>
          </View>

          {/* Privacy Note */}
          <Text style={{ 
            color: Colors.textMuted, 
            fontSize: 12, 
            fontFamily: 'PlusJakartaSans_400Regular',
            textAlign: 'center', 
            marginTop: 32, 
            paddingHorizontal: 48, 
            lineHeight: 20 
          }}>
            Your behavioral patterns are processed locally using on-device intelligence.
          </Text>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[{
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: Colors.bgBorder,
    }, style]}>
      <BlurView intensity={40} tint="light" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)' }}>
        {children}
      </View>
    </View>
  );
}

function StatCard({ iconName, label, value }: { iconName: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <GlassCard style={{ flex: 1 }}>
      <View style={{ padding: 20, alignItems: 'center' }}>
        <View style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 12, 
          backgroundColor: 'rgba(45, 212, 191, 0.15)', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: 12
        }}>
          <Ionicons name={iconName} size={20} color={Colors.accent} />
        </View>
        <Text style={{ color: Colors.textPrimary, fontSize: 18, fontFamily: 'PlusJakartaSans_800ExtraBold' }}>{value}</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 4, textTransform: 'uppercase' }}>{label}</Text>
      </View>
    </GlassCard>
  );
}

