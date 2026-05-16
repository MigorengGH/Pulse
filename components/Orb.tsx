import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Easing } from 'react-native';

interface OrbProps {
  stressScore: number;
}

export default function Orb({ stressScore }: OrbProps) {
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = stressScore > 60 ? 700 : stressScore > 30 ? 1100 : 1800;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.07, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [stressScore]);

  const orbColor = stressScore > 60 ? '#EF4444' : stressScore > 30 ? '#F59E0B' : '#00BFFF';
  const shadowOpacity = stressScore > 60 ? 0.3 : 0.2;

  return (
    <View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }}>
      {/* Outer soft glow */}
      <Animated.View style={{
        position: 'absolute',
        width: 180, height: 180, borderRadius: 90,
        backgroundColor: orbColor,
        opacity: 0.12,
        transform: [{ scale: pulseScale }],
      }} />
      {/* Main orb */}
      <Animated.View style={{
        width: 140, height: 140, borderRadius: 70,
        backgroundColor: orbColor,
        shadowColor: orbColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity,
        shadowRadius: 24,
        elevation: 10,
        transform: [{ scale: pulseScale }],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: '900', letterSpacing: 3 }}>
          PULSE
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600', letterSpacing: 2, marginTop: 2 }}>
          WELLNESS
        </Text>
      </Animated.View>
    </View>
  );
}
