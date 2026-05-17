import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, Easing, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface OrbProps {
  stressScore: number;
}

export default function Orb({ stressScore }: OrbProps) {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = stressScore > 60 ? 1500 : stressScore > 30 ? 2500 : 4000;
    
    // Breathing animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.15, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.0, duration, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      ])
    );

    // Subtle rotation
    const rotate = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 20000, easing: Easing.linear, useNativeDriver: true })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [stressScore]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const orbColor = stressScore > 60 ? '#FB7185' : stressScore > 30 ? '#FB923C' : '#57f1db';

  return (
    <View style={styles.container}>
      {/* Outer diffuse glow */}
      <Animated.View style={[styles.glow, {
        backgroundColor: orbColor,
        opacity: 0.15,
        transform: [{ scale: Animated.multiply(pulseScale, 1.4) }],
      }]} />

      {/* Rotating Background Mesh */}
      <Animated.View style={[styles.meshContainer, { transform: [{ rotate: spin }, { scale: pulseScale }] }]}>
        <LinearGradient
          colors={[orbColor, 'transparent', orbColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mesh}
        />
      </Animated.View>

      {/* Main Glass Orb */}
      <Animated.View style={[styles.orbFrame, { transform: [{ scale: pulseScale }] }]}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>
        <View style={[styles.innerBorder, { borderColor: 'rgba(255,255,255,0.3)' }]} />
        
        <View style={styles.content}>
           <Text style={styles.pulseText}>AURA</Text>
           <View style={[styles.indicator, { backgroundColor: orbColor }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  meshContainer: {
    position: 'absolute',
    width: 220,
    height: 220,
    opacity: 0.3,
  },
  mesh: {
    flex: 1,
    borderRadius: 110,
  },
  orbFrame: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 80,
    borderWidth: 0.5,
    opacity: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  pulseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 4,
    opacity: 0.9,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
});
