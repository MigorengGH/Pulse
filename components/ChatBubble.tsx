import React from 'react';
import { View, Text } from 'react-native';
import { Colors, getStressColor } from '../constants/colors';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  stressScore?: number;
}

export default function ChatBubble({ message, isUser, stressScore = 30 }: ChatBubbleProps) {
  return (
    <View style={{
      flexDirection: 'row',
      width: '100%',
      marginBottom: 12,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
    }}>
      {!isUser && (
        <View
          style={{
            width: 24, height: 24, borderRadius: 12,
            marginRight: 8, marginTop: 4,
            backgroundColor: getStressColor(stressScore),
          }}
        />
      )}
      <View
        style={{
          maxWidth: '80%',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 18,
          backgroundColor: isUser ? Colors.accent : Colors.bgCardAlt,
          borderTopRightRadius: isUser ? 4 : 18,
          borderTopLeftRadius: isUser ? 18 : 4,
        }}
      >
        <Text style={{
          color: isUser ? Colors.textOnAccent : '#e0e0e0',
          fontSize: 15,
          lineHeight: 22,
        }}>
          {message}
        </Text>
      </View>
    </View>
  );
}
