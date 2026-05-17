import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Easing } from 'react-native';
import { Colors } from '../constants/colors';

const PHASE_DURATION = 4000;

export default function BoxBreathing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  const [phase, setPhase] = useState('Breathe In');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const runCycle = () => {
      if (!isMounted.current) return;

      // Breathe In
      setPhase('Breathe In');
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.2,
          duration: PHASE_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PHASE_DURATION,
          useNativeDriver: true,
        })
      ]).start(({ finished }) => {
        if (!finished || !isMounted.current) return;

        // Hold in
        setPhase('Hold');
        const t1 = setTimeout(() => {
          if (!isMounted.current) return;

          // Breathe Out
          setPhase('Breathe Out');
          Animated.parallel([
            Animated.timing(scale, {
              toValue: 1,
              duration: PHASE_DURATION,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.4,
              duration: PHASE_DURATION,
              useNativeDriver: true,
            })
          ]).start(({ finished: f2 }) => {
            if (!f2 || !isMounted.current) return;

            // Hold out
            setPhase('Hold');
            const t2 = setTimeout(() => {
              runCycle();
            }, PHASE_DURATION);
          });
        }, PHASE_DURATION);
      });
    };

    runCycle();

    return () => {
      isMounted.current = false;
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', height: 250, width: 250 }}>
      {/* Outer Glow */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: Colors.accent,
          position: 'absolute',
          opacity: Animated.multiply(opacity, 0.2),
          transform: [{ scale: Animated.multiply(scale, 1.2) }],
        }}
      />
      
      {/* Main Circle */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          borderWidth: 2,
          borderColor: Colors.accent,
          backgroundColor: `${Colors.accent}15`,
          position: 'absolute',
          transform: [{ scale }],
          opacity,
        }}
      />
      
      <Text style={{ 
        color: Colors.accent, 
        fontWeight: '800', 
        fontSize: 22,
        letterSpacing: 1,
        textTransform: 'uppercase'
      }}>
        {phase}
      </Text>
    </View>
  );
}
