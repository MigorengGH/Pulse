import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BoxBreathing from '../../components/BoxBreathing';
import { useAuraStore } from '../../store/useAuraStore';
import { Colors } from '../../constants/colors';

export default function NudgeModal() {
  const router = useRouter();
  const setShowNudgeBanner = useAuraStore(s => s.setShowNudgeBanner);
  const nudge = useAuraStore(s => s.nudgeHistory[0]);
  const [countdown, setCountdown] = useState(10);
  const [canDismiss, setCanDismiss] = useState(false);
  const contentFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFade, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanDismiss(true);
    }
  }, [countdown]);

  const handleDismiss = () => {
    if (!canDismiss) return;
    setShowNudgeBanner(false);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 24,
        paddingTop: 40 
      }}>
        <Animated.View style={{ opacity: contentFade, alignItems: 'center', width: '100%' }}>

          {/* Header Icon */}
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: Colors.accentSoft,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="leaf-outline" size={32} color={Colors.accent} />
          </View>

          <Text style={{
            color: Colors.accent,
            fontSize: 13,
            fontFamily: 'PlusJakartaSans_700Bold',
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 8,
          }}>
            Mindful Moment
          </Text>

          <Text style={{
            color: Colors.textPrimary,
            fontSize: 32,
            fontFamily: 'PlusJakartaSans_800ExtraBold',
            textAlign: 'center',
            marginBottom: 12,
            letterSpacing: -0.5,
          }}>
            Breathe with Pulse
          </Text>

          {/* Nudge message box */}
          {nudge && (
            <View style={{
              backgroundColor: Colors.bgCard,
              borderRadius: 24,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: Colors.bgBorder,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.04,
              shadowRadius: 12,
              elevation: 2,
              width: '100%',
            }}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.accent} style={{ marginBottom: 12 }} />
              <Text style={{ 
                color: Colors.textSecondary, 
                fontSize: 16, 
                lineHeight: 24,
                fontFamily: 'PlusJakartaSans_500Medium'
              }}>
                "{nudge.message}"
              </Text>
            </View>
          )}

          <Text style={{
            color: Colors.textMuted,
            fontSize: 15,
            fontFamily: 'PlusJakartaSans_500Medium',
            textAlign: 'center',
            marginBottom: 24,
            lineHeight: 22,
            paddingHorizontal: 20,
          }}>
            Let's ground ourselves. Follow the expanding circle to sync your breath.
          </Text>

          <BoxBreathing />

          <View style={{ width: '100%', marginTop: 32 }}>
            <TouchableOpacity
              onPress={handleDismiss}
              disabled={!canDismiss}
              activeOpacity={0.8}
              style={{
                backgroundColor: canDismiss ? Colors.accent : Colors.bgBorder,
                paddingVertical: 18,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                shadowColor: canDismiss ? Colors.accent : '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: canDismiss ? 0.3 : 0,
                shadowRadius: 15,
                elevation: canDismiss ? 5 : 0,
              }}
            >
              {canDismiss ? (
                <>
                  <Text style={{ color: '#FFFFFF', fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold', marginRight: 8 }}>
                    I'm feeling better
                  </Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </>
              ) : (
                <>
                  <Text style={{ color: Colors.textMuted, fontSize: 17, fontFamily: 'PlusJakartaSans_700Bold' }}>
                    Wait {countdown}s to continue
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            {!canDismiss && (
              <Text style={{ 
                color: Colors.textMuted, 
                fontSize: 12, 
                textAlign: 'center', 
                marginTop: 16,
                fontStyle: 'italic'
              }}>
                Focus on your breath for just a moment...
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
