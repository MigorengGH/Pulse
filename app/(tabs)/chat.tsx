import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { getAuraChatResponse } from '../../lib/GeminiClient';
import { useAuraStore } from '../../store/useAuraStore';
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
        backgroundColor: Colors.bg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.bgBorder,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: statusColor, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>💬</Text>
          </View>
          <View>
            <Text style={{ color: Colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Pulse</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 12 }}>AI Wellness Companion</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={{
              flexDirection: 'row',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}
          >
            <View style={{
              maxWidth: '80%',
              padding: 14,
              paddingHorizontal: 16,
              borderRadius: 20,
              backgroundColor: msg.role === 'user' ? Colors.accent : Colors.bgCard,
              borderTopRightRadius: msg.role === 'user' ? 4 : 20,
              borderTopLeftRadius: msg.role === 'user' ? 20 : 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 1,
            }}>
              <Text style={{
                color: msg.role === 'user' ? '#FFFFFF' : Colors.textPrimary,
                fontSize: 15,
                lineHeight: 22,
              }}>
                {msg.text}
              </Text>
            </View>
          </View>
        ))}

        {isTyping && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ backgroundColor: Colors.bgCard, padding: 14, borderRadius: 20, borderTopLeftRadius: 4, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.accent} />
              <Text style={{ color: Colors.textMuted, marginLeft: 8, fontSize: 14 }}>Pulse is typing...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={{
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: Colors.bgBorder,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <TextInput
          style={{
            flex: 1,
            backgroundColor: Colors.bgInput,
            color: Colors.textPrimary,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 22,
            fontSize: 15,
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
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 18, marginTop: -2 }}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
