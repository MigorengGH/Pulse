import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuraStore } from '../../store/useAuraStore';
import { clearBaseline, savePreferences } from '../../lib/storage';
import { activateDemoMode } from '../../utils/demoData';
import { Colors } from '../../constants/colors';
import BaselineProgress from '../../components/BaselineProgress';

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
  const [showPerMinute, setShowPerMinute] = useState(false);

  const pickupsLastMinute = store.signals.filter(
    (s) => s.type === 'pickup' && s.timestamp >= Date.now() - 60 * 1000
  ).length;

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
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ color: Colors.textPrimary, fontSize: 32, fontFamily: 'PlusJakartaSans_800ExtraBold', marginBottom: 28, letterSpacing: -0.5 }}>
        Settings
      </Text>

      {/* Your Data */}
      <SectionLabel>Your Data</SectionLabel>
      <Card>
        <Row label="Days collected" value={daysOfData.toString()} />
        <Divider />
        <Row label="Pickups today" value={store.pickupsToday.toString()} />
        <Divider />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.label}>{showPerMinute ? "Pickups (last minute)" : "Pickups (last hour)"}</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
              Toggle to show rate per minute instead of per hour
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', marginRight: 16 }}>
              {showPerMinute ? pickupsLastMinute.toString() : store.pickupsLastHour.toString()}
            </Text>
            <Switch
              value={showPerMinute}
              onValueChange={setShowPerMinute}
              trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        <Divider />
        <View style={styles.row}>
          <Text style={styles.label}>Baseline</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, marginRight: 8, backgroundColor: baseline ? Colors.calm : Colors.textMuted }} />
            <Text style={{ color: baseline ? Colors.calm : Colors.textMuted, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>
              {baseline ? 'Active' : 'Learning...'}
            </Text>
          </View>
        </View>
        {!baseline && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <BaselineProgress daysCollected={daysOfData} />
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 12 }}>
              Collecting data to establish your unique digital rhythm.
            </Text>
          </View>
        )}
        <Divider />
        <TouchableOpacity onPress={handleResetBaseline} style={styles.row}>
          <Text style={[styles.label, { color: Colors.high }]}>Reset baseline</Text>
          <Text style={{ color: Colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium' }}>›</Text>
        </TouchableOpacity>
      </Card>

      {/* Nudge Preferences */}
      <SectionLabel>Nudges</SectionLabel>
      <Card>
        <View style={styles.row}>
          <Text style={styles.label}>Enable nudges</Text>
          <Switch
            value={nudgesEnabled}
            onValueChange={handleToggleNudges}
            trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Divider />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Late night mode</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>Extra sensitive after 11 PM</Text>
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
        <Text style={{ color: Colors.textSecondary, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 22, padding: 20 }}>
          Pulse does not diagnose or replace professional mental health support. If you're in crisis, please reach out to a professional.
        </Text>
        <Divider />
        <TouchableOpacity onPress={handleVersionTap} style={styles.row} activeOpacity={1}>
          <Text style={styles.label}>Version</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>1.0.0</Text>
        </TouchableOpacity>
        {__DEV__ && (
          <>
            <Divider />
            <TouchableOpacity onPress={handleResetOnboarding} style={styles.row}>
              <Text style={[styles.label, { color: Colors.elevated }]}>Reset onboarding</Text>
              <Text style={{ color: Colors.textMuted, fontFamily: 'PlusJakartaSans_500Medium' }}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </Card>

      {/* Presentation Demo Controls */}
      <SectionLabel>Presentation Demo Controls</SectionLabel>
      <Card>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Enable Presentation Mode</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
              Disables live sensors to let you manually override states for the demo.
            </Text>
          </View>
          <Switch
            value={store.isDemoMode}
            onValueChange={(val) => {
              store.setIsDemoMode(val);
              if (!val) {
                // reset everything to false when disabling
                store.setIsCharging(false);
                store.setInsomniaSignal(false);
                store.setPickups(0, 0, null);
                store.setCurrentSessionStart(null);
              }
            }}
            trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>

        {store.isDemoMode && (
          <>
            <Divider />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>⚡ Simulate Battery Charging</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
                  Force battery power status to charging state.
                </Text>
              </View>
              <Switch
                value={store.isCharging}
                onValueChange={(val) => {
                  store.setIsCharging(val);
                }}
                trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Divider />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>🌙 Simulate Late Night (Insomnia)</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
                  Force nocturnal circadian period activity detection.
                </Text>
              </View>
              <Switch
                value={store.insomniaSignal}
                onValueChange={(val) => {
                  store.setInsomniaSignal(val);
                }}
                trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Divider />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>📈 Simulate Elevated Checks (5 Pickups)</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
                  Force pickup rate to 5, triggering elevated stress levels.
                </Text>
              </View>
              <Switch
                value={store.pickupsLastHour >= 5}
                onValueChange={(val) => {
                  if (val) {
                    store.setPickups(5, 5, Date.now());
                  } else {
                    store.setPickups(0, 0, null);
                  }
                }}
                trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Divider />
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>📱 Simulate Constantly Playing Phone</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_500Medium', marginTop: 4 }}>
                  Force screen active time to exceed 20 consecutive minutes.
                </Text>
              </View>
              <Switch
                value={store.currentSessionStart !== null}
                onValueChange={(val) => {
                  if (val) {
                    store.setCurrentSessionStart(Date.now() - 20 * 60 * 1000);
                  } else {
                    store.setCurrentSessionStart(null);
                  }
                }}
                trackColor={{ false: Colors.bgBorder, true: Colors.accent }}
                thumbColor="#FFFFFF"
              />
            </View>
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
            borderRadius: 20,
            alignItems: 'center',
            marginBottom: 16,
            opacity: demoLoading ? 0.6 : 1,
          }}
        >
          {demoLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.accent} size="small" />
              <Text style={{ color: Colors.accent, fontFamily: 'PlusJakartaSans_700Bold', marginLeft: 10 }}>Activating...</Text>
            </View>
          ) : (
            <>
              <Text style={{ color: Colors.accent, fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 16 }}>🎯 Demo Mode</Text>
              <Text style={{ color: Colors.textSecondary, fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, marginTop: 6 }}>7-day mock data + AI nudge</Text>
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
    <Text style={{ color: Colors.textMuted, fontSize: 12, fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 8, paddingHorizontal: 4 }}>
      {children}
    </Text>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, borderWidth: 1, borderColor: Colors.bgBorder }}>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={{ color: Colors.textMuted, fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.bgBorder }} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
