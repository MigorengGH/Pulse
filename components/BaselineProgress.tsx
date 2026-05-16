import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface BaselineProgressProps {
  daysCollected: number;
  daysRequired?: number;
}

export default function BaselineProgress({ daysCollected, daysRequired = 3 }: BaselineProgressProps) {
  const progress = Math.min(daysCollected / daysRequired, 1);
  const isComplete = daysCollected >= daysRequired;

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: Colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
          {isComplete ? '✨ Baseline ready' : '🧠 Learning your patterns'}
        </Text>
        <Text style={{ color: isComplete ? Colors.calm : Colors.accent, fontSize: 13, fontWeight: '700' }}>
          {isComplete ? 'Done' : `Day ${daysCollected} / ${daysRequired}`}
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: Colors.bgBorder, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{
          height: '100%',
          width: `${progress * 100}%`,
          backgroundColor: isComplete ? Colors.calm : Colors.accent,
          borderRadius: 3,
        }} />
      </View>
      <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 10, lineHeight: 17 }}>
        Pulse needs {daysRequired} days of data before it can detect deviations from your normal patterns.
      </Text>
    </View>
  );
}
