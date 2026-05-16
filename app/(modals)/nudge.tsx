import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import BoxBreathing from '../../components/BoxBreathing';
import { useAuraStore } from '../../store/useAuraStore';
import { Colors } from '../../constants/colors';

export default function NudgeModal() {
  const router = useRouter();
  const setShowNudgeBanner = useAuraStore(s => s.setShowNudgeBanner);
  const nudge = useAuraStore(s => s.nudgeHistory[0]);

  const handleDismiss = () => {
    setShowNudgeBanner(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.97)' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        {/* Close */}
        <TouchableOpacity
          onPress={handleDismiss}
          style={{ position: 'absolute', top: 60, right: 24, padding: 8 }}
        >
          <Text style={{ color: Colors.textMuted, fontSize: 24 }}>✕</Text>
        </TouchableOpacity>

        {/* Label */}
        <Text style={{
          color: Colors.accent,
          fontSize: 12,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 12,
        }}>
          Time to breathe
        </Text>

        <Text style={{
          color: Colors.textPrimary,
          fontSize: 26,
          fontWeight: '800',
          textAlign: 'center',
          marginBottom: 10,
          letterSpacing: -0.3,
        }}>
          Let's slow down
        </Text>

        {/* Nudge message */}
        {nudge && (
          <View style={{
            backgroundColor: Colors.accentSoft,
            borderRadius: 16,
            padding: 16,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: `${Colors.accent}30`,
          }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
              {nudge.message}
            </Text>
          </View>
        )}

        <Text style={{
          color: Colors.textMuted,
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 20,
        }}>
          Follow the circle — breathe in as it grows,{'\n'}hold, then breathe out.
        </Text>

        <BoxBreathing />

        <TouchableOpacity
          onPress={handleDismiss}
          style={{
            marginTop: 40,
            paddingVertical: 16,
            paddingHorizontal: 40,
            borderRadius: 16,
            backgroundColor: Colors.bgCard,
            borderWidth: 1,
            borderColor: Colors.bgBorder,
          }}
        >
          <Text style={{ color: Colors.textSecondary, fontSize: 15, fontWeight: '600' }}>I'm feeling better ✓</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
