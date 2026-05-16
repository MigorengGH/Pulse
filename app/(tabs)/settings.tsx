import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuraStore } from '../../store/useAuraStore';
import { clearBaseline, savePreferences } from '../../lib/storage';
import { activateDemoMode } from '../../utils/demoData';
import { Colors } from '../../constants/colors';

export default function SettingsScreen() {
  const store = useAuraStore();
  const router = useRouter();
  const { preferences, daysOfData, baseline } = store;
  const [nudgesEnabled, setNudgesEnabled] = useState(preferences.nudgesEnabled);
  const [lateNightMode, setLateNightMode] = useState(preferences.lateNightMode);
  const [tapCount, setTapCount] = useState(0);
  const [showDemoButton, setShowDemoButton] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This clears the onboarding flag and shows the intro screens again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Restart',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('aura_onboarding_complete');
            store.setOnboardingComplete(false);
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  const handleToggleNudges = (value: boolean) => {
    setNudgesEnabled(value);
    store.setPreferences({ ...preferences, nudgesEnabled: value });
    savePreferences({ ...preferences, nudgesEnabled: value });
  };

  const handleToggleLateNight = (value: boolean) => {
    setLateNightMode(value);
    store.setPreferences({ ...preferences, lateNightMode: value });
    savePreferences({ ...preferences, lateNightMode: value });
  };

  const handleResetBaseline = () => {
    Alert.alert(
      'Reset Baseline',
      'This clears your learned patterns. Pulse will need 3 days to relearn.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => { await clearBaseline(); store.resetBaseline(); } },
      ]
    );
  };

  const handleVersionTap = () => {
    const next = tapCount + 1;
    setTapCount(next);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 2000);
    if (next >= 5) { setShowDemoButton(true); setTapCount(0); }
  };

  const handleActivateDemo = async () => {
    setDemoLoading(true);
    try {
      await activateDemoMode();
      Alert.alert('🎯 Demo Mode Active', 'Mock data loaded! Check the Home screen.');
    } catch (e) {
      Alert.alert('Error', 'Demo mode failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <Text style={{ color: Colors.textPrimary, fontSize: 30, fontWeight: '800', marginBottom: 28, letterSpacing: -0.5 }}>
        Settings
      </Text>

      {/* Your Data */}
      <SectionLabel>Your Data</SectionLabel>
      <Card>
        <Row label="Days collected" value={daysOfData.toString()} />
        <Divider />
        <View style={rowStyle}>
          <Text style={labelStyle}>Baseline</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 6, backgroundColor: baseline ? Colors.calm : Colors.textMuted }} />
            <Text style={{ color: baseline ? Colors.calm : Colors.textMuted, fontSize: 14, fontWeight: '600' }}>
              {baseline ? 'Active' : 'Learning...'}
            </Text>
          </View>
        </View>
        <Divider />
        <TouchableOpacity onPress={handleResetBaseline} style={rowStyle}>
          <Text style={[labelStyle, { color: Colors.high }]}>Reset baseline</Text>
          <Text style={{ color: Colors.textMuted }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Nudge Preferences */}
      <SectionLabel>Nudges</SectionLabel>
      <Card>
        <View style={rowStyle}>
          <Text style={labelStyle}>Enable nudges</Text>
          <Switch
            value={nudgesEnabled}
            onValueChange={handleToggleNudges}
            trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Divider />
        <View style={rowStyle}>
          <View style={{ flex: 1 }}>
            <Text style={labelStyle}>Late night mode</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>Extra sensitive after 11 PM</Text>
          </View>
          <Switch
            value={lateNightMode}
            onValueChange={handleToggleLateNight}
            trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Divider />
        <Row label="Quiet hours" value="12 AM – 7 AM" />
      </Card>

      {/* About */}
      <SectionLabel>About</SectionLabel>
      <Card>
        <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 22, padding: 16 }}>
          Pulse does not diagnose or replace professional mental health support. If you're in crisis, please reach out to a professional.
        </Text>
        <Divider />
        <TouchableOpacity onPress={handleVersionTap} style={rowStyle} activeOpacity={1}>
          <Text style={labelStyle}>Version</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14 }}>1.0.0</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <>
            <Divider />
            <TouchableOpacity onPress={handleResetOnboarding} style={rowStyle}>
              <Text style={[labelStyle, { color: Colors.elevated }]}>Reset onboarding</Text>
              <Text style={{ color: Colors.textMuted }}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </Card>

      {/* Hidden Demo Button */}
      {showDemoButton && (
        <TouchableOpacity
          onPress={handleActivateDemo}
          disabled={demoLoading}
          style={{
            backgroundColor: Colors.accentSoft,
            borderWidth: 1.5,
            borderColor: Colors.accent,
            borderStyle: 'dashed',
            padding: 18,
            borderRadius: 16,
            alignItems: 'center',
            marginBottom: 16,
            opacity: demoLoading ? 0.6 : 1,
          }}
        >
          {demoLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={{ color: Colors.accent, fontWeight: '700', marginLeft: 10 }}>Activating...</Text>
            </View>
          ) : (
            <>
              <Text style={{ color: Colors.accent, fontWeight: '800', fontSize: 16 }}>🎯 Demo Mode</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>7-day mock data + AI nudge</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyle}>
      <Text style={labelStyle}>{label}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.bgBorder, marginHorizontal: 16 }} />;
}

const rowStyle = { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, padding: 16 };
const labelStyle = { color: Colors.textPrimary, fontSize: 15 } as const;
