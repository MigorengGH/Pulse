import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { getAuraChatResponse } from '../../lib/GeminiClient';
import { useAuraStore } from '../../store/useAuraStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getStressColor } from '../../constants/colors';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hi there 👋 Just checking in — how are you feeling right now?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const stressScore = useAuraStore(state => state.stressScore);
  const statusColor = getStressColor(stressScore);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const userMsg: Message = { role: 'user', text: inputText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInputText('');
    setIsTyping(true);

    const history = messages.slice(1).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
    const response = await getAuraChatResponse(history, userMsg.text);

    setMessages([...updated, { role: 'model', text: response }]);
    setIsTyping(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={{
        paddingHorizontal: 24,
        paddingTop: 64,
        paddingBottom: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: Colors.bgBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
        zIndex: 10,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: statusColor, marginRight: 12, justifyContent: 'center', alignItems: 'center', shadowColor: statusColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}>
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
          </View>
          <View>
            <Text style={{ color: Colors.textPrimary, fontSize: 20, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -0.3 }}>Pulse</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>AI Wellness Companion</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16,
            }}
          >
            <View style={{
              maxWidth: '85%',
              padding: 16,
              paddingHorizontal: 20,
              borderRadius: 24,
              backgroundColor: msg.role === 'user' ? Colors.accent : '#FFFFFF',
              borderBottomRightRadius: msg.role === 'user' ? 4 : 24,
              borderBottomLeftRadius: msg.role === 'user' ? 24 : 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: msg.role === 'user' ? 0.2 : 0.04,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: msg.role === 'user' ? 0 : 1,
              borderColor: msg.role === 'user' ? 'transparent' : Colors.bgBorder,
            }}>
              <Text style={{
                color: msg.role === 'user' ? '#FFFFFF' : Colors.textPrimary,
                fontSize: 15,
                lineHeight: 24,
                fontFamily: 'PlusJakartaSans_500Medium',
              }}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ backgroundColor: '#FFFFFF', padding: 14, borderRadius: 24, borderBottomLeftRadius: 4, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, borderWidth: 1, borderColor: Colors.bgBorder }}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={{ color: Colors.textMuted, marginLeft: 10, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>Pulse is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={{
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: Colors.bgBorder,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.03,
        shadowRadius: 16,
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: Colors.bg,
            color: Colors.textPrimary,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 24,
            fontSize: 15,
            fontFamily: 'PlusJakartaSans_500Medium',
            borderWidth: 1,
            borderColor: Colors.bgBorder,
          }}
          placeholder="Message Pulse..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: Colors.accent,
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
