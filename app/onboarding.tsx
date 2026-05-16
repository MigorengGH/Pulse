import React, { useRef, useState } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuraStore } from '../store/useAuraStore';
import { saveOnboardingComplete } from '../lib/storage';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    icon: '🌊',
    title: 'Pulse learns\nyour rhythm',
    body: 'No forms. No check-ins. Pulse quietly watches your phone patterns and learns what "normal" looks like for you.',
    accent: Colors.accent,
  },
  {
    id: '2',
    icon: '🔔',
    title: 'Catch stress\nbefore you feel it',
    body: 'When your behaviour shifts from your baseline, Pulse sends a gentle nudge. Not an alarm — just a quiet moment.',
    accent: Colors.calm,
  },
  {
    id: '3',
    icon: '🔒',
    title: 'Your data\nnever leaves',
    body: 'Pulse never reads messages or content. Only usage patterns — which apps, how long. Nothing more.',
    accent: '#8B5CF6',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();
  const setOnboardingComplete = useAuraStore(s => s.setOnboardingComplete);

  const finish = async () => {
    await saveOnboardingComplete();
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  const next = () => {
    if (currentIndex < slides.length - 1) {
      const nextIdx = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIdx * width, animated: true });
      setCurrentIndex(nextIdx);
    } else {
      finish();
    }
  };

  const current = slides[currentIndex];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => (
          <View key={slide.id} style={{ width, flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', paddingTop: 80, paddingBottom: 40 }}>
            {/* Icon circle */}
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: `${slide.accent}15`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 48,
              borderWidth: 1.5,
              borderColor: `${slide.accent}30`,
            }}>
              <Text style={{ fontSize: 52 }}>{slide.icon}</Text>
            </View>

            <Text style={{
              fontSize: 34,
              fontWeight: '800',
              color: Colors.textPrimary,
              textAlign: 'center',
              lineHeight: 42,
              marginBottom: 20,
              letterSpacing: -0.5,
            }}>
              {slide.title}
            </Text>

            <Text style={{
              fontSize: 17,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 26,
              paddingHorizontal: 8,
            }}>
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom */}
      <View style={{ paddingHorizontal: 28, paddingBottom: 52 }}>
        {/* Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 32 }}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={{
                height: 8,
                width: i === currentIndex ? 28 : 8,
                borderRadius: 4,
                backgroundColor: i === currentIndex ? Colors.accent : Colors.bgBorder,
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity
          onPress={next}
          activeOpacity={0.85}
          style={{
            backgroundColor: Colors.accent,
            paddingVertical: 18,
            borderRadius: 18,
            alignItems: 'center',
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 6,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 }}>
            {currentIndex === slides.length - 1 ? 'Get Started →' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        {currentIndex < slides.length - 1 && (
          <TouchableOpacity onPress={finish} style={{ alignItems: 'center', marginTop: 16, padding: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 15 }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
