import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../constants/colors';

interface SignalCardProps {
  title: string;
  value: string;
}

export default function SignalCard({ title, value }: SignalCardProps) {
  return (
    <View style={{
      backgroundColor: Colors.bgCard,
      padding: 14,
      borderRadius: 16,
      flex: 1,
      marginHorizontal: 4,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 85,
      borderWidth: 1,
      borderColor: Colors.bgBorder,
    }}>
      <Text style={{
        color: Colors.textMuted,
        fontSize: 11,
        textAlign: 'center',
        marginBottom: 6,
        fontWeight: '600',
      }}>
        {title}
      </Text>
      <Text style={{
        color: Colors.accent,
        fontWeight: '800',
        fontSize: 20,
        textAlign: 'center',
      }}>
        {value}
      </Text>
    </View>
  );
}
