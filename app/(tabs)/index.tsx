import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, ScrollView, Animated, Dimensions, Alert, TouchableOpacity } from 'react-native';
import Orb from '../../components/Orb';
import BaselineProgress from '../../components/BaselineProgress';
import { useAuraStore } from '../../store/useAuraStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getGreeting, getStressLabel, getStressColor } from '../../constants/colors';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function Home() {
  const state = useAuraStore();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // Interceptor Overlay States
  const [showTakeover, setShowTakeover] = useState(false);
  const [takeoverTriggered, setTakeoverTriggered] = useState(false);

  // Takeover Box Breathing States
  const [breathState, setBreathState] = useState<'Inhale' | 'Hold In' | 'Exhale' | 'Hold Out'>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [breathsCompleted, setBreathsCompleted] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ]).start();
  }, []);

  // Monitor stress triggers to automatically launch takeover simulation!
  const lastAnalysis = state.lastAnalysis;
  const triggers = lastAnalysis?.triggers || [];
  const isErraticSwipe = triggers.includes('Erratic/Anxious Swipe Pattern (Restlessness)');
  const hasLateNightStress = triggers.includes('Playing phone constantly while charging late at night (High Stress)') || 
                             triggers.includes('Late night scrolling while still (in-bed scrolling)') ||
                             (isErraticSwipe && state.stressScore >= 65);

  const takeoverComment = isErraticSwipe
    ? "We detected a frantic, rapid swipe pattern on your screen. Erratic scroll flicking is a direct biometric signature of high anxiety and nervous restlessness."
    : "We noticed you've been surfing Instagram late at night while charging. Late-night screen stimulation suppresses melatonin and keeps your nervous system awake.";

  useEffect(() => {
    if (hasLateNightStress && !takeoverTriggered) {
      setTakeoverTriggered(true);
      setShowTakeover(true);
    } else if (!hasLateNightStress) {
      setTakeoverTriggered(false);
    }
  }, [hasLateNightStress]);

  // Breathing Box Timer
  useEffect(() => {
    if (!showTakeover) {
      setBreathState('Inhale');
      setSecondsLeft(4);
      setBreathsCompleted(0);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setBreathState(curr => {
            if (curr === 'Inhale') return 'Hold In';
            if (curr === 'Hold In') return 'Exhale';
            if (curr === 'Exhale') return 'Hold Out';
            setBreathsCompleted(b => b + 1);
            return 'Inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showTakeover]);

  // Dynamic Size & Colors for breathing circle
  const circleSize = 
    breathState === 'Inhale' ? 100 + (4 - secondsLeft) * 15 :
    breathState === 'Hold In' ? 160 :
    breathState === 'Exhale' ? 160 - (4 - secondsLeft) * 15 :
    100;

  const circleColor =
    breathState === 'Inhale' ? '#2dd4bf' :
    breathState === 'Hold In' ? '#3b82f6' :
    breathState === 'Exhale' ? '#f43f5e' :
    '#a855f7';

  // Frantic Swiping / Gestures Detector for Stress & Anxiety simulation
  const lastTouchRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const anxiousSwipesCountRef = useRef<number>(0);

  const handleTouchStart = (e: any) => {
    const { pageX, pageY } = e.nativeEvent;
    lastTouchRef.current = { time: Date.now(), x: pageX, y: pageY };
  };

  const handleTouchEnd = (e: any) => {
    if (!lastTouchRef.current) return;
    const { pageX, pageY } = e.nativeEvent;
    const duration = Date.now() - lastTouchRef.current.time;
    const distance = Math.sqrt(Math.pow(pageX - lastTouchRef.current.x, 2) + Math.pow(pageY - lastTouchRef.current.y, 2));

    // A swipe gesture has distance >= 30px and is completed within 300ms
    if (distance > 30 && duration < 300) {
      const speed = distance / duration; // velocity in px/ms
      
      // Anxious swiping is characterized by fast, energetic flicks (speed > 1.0)
      if (speed > 1.0) {
        anxiousSwipesCountRef.current += 1;
        const currentStress = state.stressScore;

        if (anxiousSwipesCountRef.current >= 3) {
          // Add trigger under the hood to store
          const newTriggers = Array.from(new Set([...(state.lastAnalysis?.triggers || []), 'Erratic/Anxious Swipe Pattern (Restlessness)']));
          
          // Increment stress score towards 65% in 15% intervals
          const nextStress = Math.min(65, currentStress + 15);
          
          useAuraStore.setState({
            stressScore: nextStress,
            lastAnalysis: {
              ...state.lastAnalysis,
              triggers: newTriggers,
              deviationScore: nextStress,
            } as any
          });

          // Check if stress score has reached 65% threshold to trigger breathing takeover!
          if (nextStress >= 65) {
            setShowTakeover(true);
            setTakeoverTriggered(true);
          }
        }
      }
    }
  };

  const handleCloseApp = () => {
    anxiousSwipesCountRef.current = 0;
    state.setIsDemoMode(false);
    useAuraStore.setState({
      stressScore: 10,
      isCharging: false,
      currentSessionStart: null,
      insomniaSignal: false,
      lastAnalysis: {
        triggers: [],
        score: 10,
        deviationScore: 10,
      } as any
    });
    setShowTakeover(false);
    Alert.alert("Intervention Complete! 🪷", "Stress score reset to baseline. Swiping patterns have calmed down!");
  };

  const handleContinueAnyway = () => {
    anxiousSwipesCountRef.current = 0;
    setShowTakeover(false);
  };

  const label = useMemo(() => getStressLabel(state.stressScore), [state.stressScore]);
  const greeting = useMemo(() => getGreeting(), []);
  const stressColor = useMemo(() => getStressColor(state.stressScore), [state.stressScore]);

  const totalScreenTime = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const sessions = state.signals.filter(s => s.type === 'session' && s.timestamp > today && s.durationMs);
    let totalMs = sessions.reduce((a, s) => a + (s.durationMs || 0), 0);

    // Include current active session if there is one!
    if (state.currentSessionStart) {
      totalMs += Date.now() - state.currentSessionStart;
    }

    const secs = Math.round(totalMs / 1000);
    const mins = Math.floor(secs / 60);
    if (state.isDemoMode && secs < 60) {
      return `${secs}s`;
    }
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  }, [state.signals, state.currentSessionStart, state.isDemoMode]);

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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
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
            <StatCard iconName="phone-portrait-outline" label="Total Pickups" value={state.pickupsToday.toString()} />
            <StatCard iconName="time-outline" label="Focus" value={totalScreenTime} />
            <StatCard iconName="moon-outline" label="Rest" value={state.insomniaSignal ? 'Late' : 'Steady'} />
          </View>

          {/* Device Status Bar */}
          <View style={{ paddingHorizontal: 24, marginTop: 16 }}>
            <GlassCard>
              <View style={{ paddingVertical: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="phone-portrait-outline" size={18} color={state.appIsActive ? Colors.calm : Colors.textMuted} />
                  <Text style={{ color: Colors.textPrimary, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    Phone: {state.appIsActive ? '🟢 On the Phone' : '⚪ Idle'}
                  </Text>
                </View>
                <View style={{ width: 1, height: 16, backgroundColor: Colors.bgBorder }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={state.isCharging ? "flash" : "battery-dead"} size={18} color={state.isCharging ? Colors.high : Colors.textMuted} />
                  <Text style={{ color: Colors.textPrimary, fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                    Power: {state.isCharging ? '⚡ Charging' : '🔋 On Battery'}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Late-Night Digital Habits App Usage Breakdown */}
          <AppUsageBreakdown />

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
                
                <Text style={{ color: Colors.textPrimary, fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', lineHeight: 24, marginBottom: 12 }}>
                  {lastNudge ? lastNudge.message : "Aura is currently observing your digital rhythm to provide contextual mindfulness nudges."}
                </Text>

                {state.lastAnalysis && state.lastAnalysis.triggers.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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

                {/* Custom rich behavioral recommendations based on current triggers & stress! */}
                <View style={{ 
                  marginTop: 4, 
                  borderTopWidth: 1, 
                  borderColor: Colors.bgBorder, 
                  paddingTop: 16, 
                  gap: 12 
                }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                    Active Recommendations:
                  </Text>
                  
                  {state.stressScore > 50 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="medical-outline" size={16} color="#EF4444" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        Elevated stress detected. Engage in a brief 4-7-8 deep breathing pattern.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#2DD4BF" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        Keep your breathing rhythm steady and screen sessions short.
                      </Text>
                    </View>
                  )}

                  {state.insomniaSignal ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="moon-outline" size={16} color="#F59E0B" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        Late-night screen activity identified. Enable night shift and dim blue light.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="sunny-outline" size={16} color="#3B82F6" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        Circadian balance healthy. Excellent night rest behaviors.
                      </Text>
                    </View>
                  )}

                  {state.pickupsToday > 25 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="timer-outline" size={16} color="#EF4444" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        Frequent pick-up count is active. Place device face-down to protect focus.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="leaf-outline" size={16} color="#2DD4BF" />
                      <Text style={{ color: Colors.textSecondary, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium', flex: 1 }}>
                        High attention stamina. Great screen rest intervals.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Direct Action Button to Chat screen */}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/chat')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(45, 212, 191, 0.08)',
                    borderRadius: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(45, 212, 191, 0.2)',
                    marginTop: 18,
                  }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.accent} style={{ marginRight: 8 }} />
                  <Text style={{ color: Colors.accent, fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    Discuss rhythms with Aura
                  </Text>
                </TouchableOpacity>

                {/* Direct Action Button to Breathing modal */}
                <TouchableOpacity
                  onPress={() => router.push('/(modals)/nudge')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.accent,
                    borderRadius: 16,
                    paddingVertical: 14,
                    shadowColor: Colors.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3,
                    marginTop: 12,
                  }}
                >
                  <Ionicons name="leaf-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    Take a Breathing Pause 🧘
                  </Text>
                </TouchableOpacity>
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

      {/* Absolute Takeover Interceptor Overlay (Instagram Taking Over Simulation) */}
      {/* Absolute Takeover Interceptor Overlay */}
      {showTakeover && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          backgroundColor: '#090D16',
        }}>
          {isErraticSwipe ? (
            /* 1. ERGONOMICS & BIO-SENSORY AGITATION INTERVENTION */
            <BlurView intensity={90} tint="dark" style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              padding: 24,
            }}>
              <View style={{ 
                backgroundColor: 'rgba(11, 19, 43, 0.96)',
                borderRadius: 32,
                padding: 28,
                borderWidth: 1.5,
                borderColor: 'rgba(56, 189, 248, 0.3)', // Soothing Sky Blue representing bio-electricity
                shadowColor: '#38bdf8',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.3,
                shadowRadius: 24,
                elevation: 10,
                alignItems: 'center',
              }}>
                {/* Biometric Shield/Wave Icon */}
                <View style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 32, 
                  backgroundColor: 'rgba(56, 189, 248, 0.15)', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderWidth: 1.5,
                  borderColor: '#38bdf8',
                  marginBottom: 16
                }}>
                  <Ionicons name="pulse" size={32} color="#38bdf8" />
                </View>
                
                <Text style={{ color: '#FFFFFF', fontSize: 24, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' }}>
                  Nervous System Intercept
                </Text>
                
                <Text style={{ color: '#38bdf8', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>
                  Frantic Swipe Motion Detected
                </Text>

                <Text style={{ 
                  color: '#CBD5E1', 
                  fontSize: 14, 
                  fontFamily: 'PlusJakartaSans_500Medium', 
                  textAlign: 'center', 
                  lineHeight: 22, 
                  marginTop: 18,
                  marginBottom: 8
                }}>
                  Our on-device model identified erratic, rapid swiping and high flick velocity. This subconscious action is a physical trigger that releases cortisol and elevates your resting heart rate.
                </Text>

                {/* Grounding instruction */}
                <View style={{ 
                  backgroundColor: 'rgba(56, 189, 248, 0.08)', 
                  borderRadius: 16, 
                  padding: 12, 
                  borderWidth: 1, 
                  borderColor: 'rgba(56, 189, 248, 0.15)', 
                  marginVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <Ionicons name="finger-print-outline" size={20} color="#38bdf8" />
                  <Text style={{ color: '#E2E8F0', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', flex: 1 }}>
                    Place your finger gently on the circle below to ground your focus.
                  </Text>
                </View>

                {/* Animated Box Breathing Circle (Soothing Teal & Sky Blue style) */}
                <View style={{ alignItems: 'center', marginVertical: 16 }}>
                  <View style={{
                    width: 170,
                    height: 170,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {/* Glowing Animated Outer Ring */}
                    <View style={{
                      position: 'absolute',
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                      backgroundColor: '#38bdf8',
                      opacity: 0.15,
                    }} />
                    
                    {/* Solid Interactive Core */}
                    <View style={{
                      width: circleSize - 24,
                      height: circleSize - 24,
                      borderRadius: (circleSize - 24) / 2,
                      backgroundColor: '#0F172A',
                      borderWidth: 3,
                      borderColor: '#38bdf8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#38bdf8',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 10,
                      elevation: 6,
                    }}>
                      <Ionicons name="leaf-outline" size={24} color="#38bdf8" style={{ marginBottom: 4 }} />
                      <Text style={{ color: '#FFFFFF', fontSize: 13, fontFamily: 'PlusJakartaSans_800ExtraBold', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {breathState}
                      </Text>
                      <Text style={{ color: '#FFFFFF', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 }}>
                        {secondsLeft}s
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12 }}>
                    {breathsCompleted > 0 
                      ? `✓ Nervous System Stabilized! Ready to reflect.` 
                      : "Synchronize your breathing with the pulse..."}
                  </Text>
                </View>

                {/* Interactive Decisions */}
                <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={handleCloseApp}
                    style={{
                      backgroundColor: '#38bdf8',
                      borderRadius: 16,
                      paddingVertical: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      shadowColor: '#38bdf8',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}
                  >
                    <Text style={{ color: '#0F172A', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' }}>
                      Take a 5-Minute Mindful Break 🧘
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleContinueAnyway}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                      Continue anyway
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          ) : (
            /* 2. LATE NIGHT INSTAGRAM DOOMSCROLLING OVERLAY */
            <>
              {/* Faded Mock Instagram Feed */}
              <View style={{ opacity: 0.12, flex: 1, paddingHorizontal: 20, paddingTop: 60 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', fontFamily: 'serif' }}>Instagram</Text>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
                  </View>
                </View>
                <View style={{ width: '100%', height: 280, backgroundColor: '#1E293B', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="image-outline" size={64} color="#334155" />
                </View>
                <Text style={{ color: '#FFFFFF', marginTop: 16, fontWeight: 'bold', fontFamily: 'PlusJakartaSans_700Bold' }}>insta_scroller_99</Text>
                <Text style={{ color: '#94A3B8', marginTop: 6, fontFamily: 'PlusJakartaSans_400Regular' }}>Endless scrolling late at night...</Text>
              </View>

              {/* Intrusive Premium Intervention Card */}
              <BlurView intensity={80} tint="dark" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                justifyContent: 'center',
                padding: 24,
              }}>
                <View style={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  borderRadius: 32,
                  padding: 28,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.5,
                  shadowRadius: 24,
                  elevation: 10,
                  alignItems: 'center',
                }}>
                  {/* Alert Header */}
                  <View style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 28, 
                    backgroundColor: 'rgba(239, 68, 68, 0.15)', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: '#EF4444',
                    marginBottom: 16
                  }}>
                    <Ionicons name="shield-half" size={28} color="#EF4444" />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 22, fontFamily: 'PlusJakartaSans_800ExtraBold', textAlign: 'center' }}>
                    Digital Intervention
                  </Text>
                  <Text style={{ color: '#EF4444', fontSize: 11, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>
                    Late Night Scrolling
                  </Text>

                  {/* Dynamic Behavioral Feedback Comment */}
                  <Text style={{ 
                    color: '#CBD5E1', 
                    fontSize: 14, 
                    fontFamily: 'PlusJakartaSans_500Medium', 
                    textAlign: 'center', 
                    lineHeight: 22, 
                    marginTop: 16,
                    marginBottom: 12
                  }}>
                    {takeoverComment}
                  </Text>

                  {/* Animated Box Breathing Circle */}
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <View style={{
                      width: 170,
                      height: 170,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {/* Glowing Animated Outer Ring */}
                      <View style={{
                        position: 'absolute',
                        width: circleSize,
                        height: circleSize,
                        borderRadius: circleSize / 2,
                        backgroundColor: circleColor,
                        opacity: 0.12,
                      }} />
                      
                      {/* Solid Interactive Core */}
                      <View style={{
                        width: circleSize - 24,
                        height: circleSize - 24,
                        borderRadius: (circleSize - 24) / 2,
                        backgroundColor: circleColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: circleColor,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.4,
                        shadowRadius: 10,
                        elevation: 6,
                      }}>
                        <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: 'PlusJakartaSans_800ExtraBold', textTransform: 'uppercase' }}>
                          {breathState}
                        </Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', marginTop: 2 }}>
                          {secondsLeft}s
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold', marginTop: 12 }}>
                      {breathsCompleted > 0 
                        ? `✓ Cycle Complete! Ready to reflect.` 
                        : "Follow along to calm your nervous system..."}
                    </Text>
                  </View>

                  {/* Interactive Decisions */}
                  <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
                    <TouchableOpacity
                      onPress={handleCloseApp}
                      style={{
                        backgroundColor: Colors.accent,
                        borderRadius: 16,
                        paddingVertical: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: Colors.accent,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' }}>
                        Close Instagram & Go to Bed 🌙
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleContinueAnyway}
                      style={{
                        borderRadius: 16,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                      }}
                    >
                      <Text style={{ color: '#94A3B8', fontSize: 13, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
                        Continue using Instagram anyway
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            </>
          )}
        </View>
      )}
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

function AppUsageBreakdown() {
  const usageData = [
    { 
      name: 'TikTok', 
      time: '1h 45m', 
      percentage: 50, 
      color: '#00f2fe', // Tiktok Cyan
      icon: 'logo-tiktok' as const,
      disruption: 'High Dopamine Hook'
    },
    { 
      name: 'Instagram', 
      time: '1h 12m', 
      percentage: 34, 
      color: '#f43f5e', // Instagram Sunset Pink
      icon: 'logo-instagram' as const,
      disruption: 'Social FOMO scroll'
    },
    { 
      name: 'Twitter (X)', 
      time: '35m', 
      percentage: 16, 
      color: '#64748b', // Slate Gray
      icon: 'logo-twitter' as const,
      disruption: 'Information Alertness'
    }
  ];

  return (
    <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
      <GlassCard>
        <View style={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View>
              <Text style={{ color: Colors.accent, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Late-Night Screen Habits
              </Text>
              <Text style={{ color: Colors.textPrimary, fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', marginTop: 4 }}>
                Active Disruptor Breakdown
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <Text style={{ color: '#EF4444', fontSize: 10, fontFamily: 'PlusJakartaSans_700Bold' }}>🚨 SLEEP RISK</Text>
            </View>
          </View>

          <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 20, marginBottom: 20 }}>
            Apps with the highest usage between 11:00 PM and 4:00 AM over the last 7 days:
          </Text>

          <View style={{ gap: 18 }}>
            {usageData.map((app, i) => (
              <View key={i}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={app.icon} size={18} color={app.color} />
                    </View>
                    <View>
                      <Text style={{ color: Colors.textPrimary, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' }}>{app.name}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 11, fontFamily: 'PlusJakartaSans_500Medium' }}>{app.disruption}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: Colors.textPrimary, fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold' }}>{app.time}</Text>
                    <Text style={{ color: Colors.accent, fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{app.percentage}% of bedtime</Text>
                  </View>
                </View>

                {/* Progress Bar Container */}
                <View style={{ width: '100%', height: 6, backgroundColor: Colors.bg, borderRadius: 4, overflow: 'hidden' }}>
                  <View style={{ width: `${app.percentage}%`, height: '100%', backgroundColor: app.color, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </View>

          {/* AI Disruptor Insight */}
          <View style={{ marginTop: 24, padding: 16, backgroundColor: 'rgba(45, 212, 191, 0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(45, 212, 191, 0.15)' }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="sparkles" size={14} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold' }}>AURA SLEEP INSIGHT</Text>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 }}>
              TikTok scrolling represents 50% of your late-night usage. The fast-paced dopamine hooks delay sleep onset by an average of 48 minutes, keeping your brain alert.
            </Text>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

