import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { getStressColor } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

interface OrbProps {
  stressScore: number;
}

export default function Orb({ stressScore }: OrbProps) {
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const color = getStressColor(stressScore);

  useEffect(() => {
    // Extremely slow, deep breathing cycle (4 seconds in, 4 seconds out)
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { 
          toValue: 1.15, 
          duration: 4000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
        Animated.timing(breatheAnim, { 
          toValue: 1.0, 
          duration: 4000, 
          easing: Easing.inOut(Easing.sin), 
          useNativeDriver: true 
        }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [stressScore]); // Added dependency

  return (
    <View style={styles.container}>
      {/* A very faint, larger diffuse aura behind it */}
      <Animated.View style={[
        styles.diffuseAura,
        {
          backgroundColor: color,
          transform: [{ scale: Animated.multiply(breatheAnim, 1.2) }],
        }
      ]} />

      {/* The main calm circle */}
      <Animated.View style={[
        styles.calmCircle,
        {
          backgroundColor: color,
          transform: [{ scale: breatheAnim }],
          shadowColor: color,
        }
      ]}>
        <View style={styles.content}>
           <Text style={styles.percentageText}>
             {Math.round(stressScore)}<Text style={styles.percentSymbol}>%</Text>
           </Text>
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
             <Ionicons 
               name={stressScore > 55 ? "trending-up-outline" : stressScore < 35 ? "trending-down-outline" : "ellipse-outline"} 
               size={12} 
               color="rgba(255, 255, 255, 0.75)" 
             />
             <Text style={styles.label}>
               Aura
             </Text>
           </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calmCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.9,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    zIndex: 2,
  },

  diffuseAura: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.15,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontFamily: 'PlusJakartaSans_400Regular', // Much softer, airy font
    letterSpacing: -1.5,
  },
  percentSymbol: {
    fontSize: 20,
    opacity: 0.8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_500Medium',
    letterSpacing: 3,
    opacity: 0.7,
    marginTop: 4,
    textTransform: 'uppercase',
  }
});
