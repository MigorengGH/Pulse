import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';

export default function NudgeBanner() {
  const router = useRouter();

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      marginHorizontal: 14,
      marginTop: 54,
      marginBottom: 6,
      padding: 14,
      borderRadius: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 3,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.textPrimary, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>
          💙 Noticed some restlessness
        </Text>
        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Want to take a breath?</Text>
      </View>
      <TouchableOpacity
        style={{
          backgroundColor: Colors.accent,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: 12,
        }}
        onPress={() => router.push('/(modals)/nudge')}
      >
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>Pause →</Text>
      </TouchableOpacity>
    </View>
  );
}
