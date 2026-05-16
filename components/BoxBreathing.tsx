import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, Easing } from 'react-native';

const PHASE_DURATION = 4000;

export default function BoxBreathing() {
  const scale = useRef(new Animated.Value(1)).current;
  const [phase, setPhase] = useState('Breathe In');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const runCycle = () => {
      if (!isMounted.current) return;

      // Breathe In
      setPhase('Breathe In');
      Animated.timing(scale, {
        toValue: 2.2,
        duration: PHASE_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !isMounted.current) return;

        // Hold in
        setPhase('Hold');
        const t1 = setTimeout(() => {
          if (!isMounted.current) return;

          // Breathe Out
          setPhase('Breathe Out');
          Animated.timing(scale, {
            toValue: 1,
            duration: PHASE_DURATION,
            easing: Easing.linear,
            useNativeDriver: true,
          }).start(({ finished: f2 }) => {
            if (!f2 || !isMounted.current) return;

            // Hold out
            setPhase('Hold');
            const t2 = setTimeout(() => {
              runCycle();
            }, PHASE_DURATION);
            return () => clearTimeout(t2);
          });
        }, PHASE_DURATION);
        return () => clearTimeout(t1);
      });
    };

    runCycle();

    return () => {
      isMounted.current = false;
      scale.stopAnimation();
    };
  }, []);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, width: '100%', height: 256 }}>
      <Animated.View
        style={{
          width: 96,
          height: 96,
          borderRadius: 48,
          borderWidth: 4,
          borderColor: '#4ECDC4',
          position: 'absolute',
          transform: [{ scale }],
        }}
      />
      <Text style={{ color: '#4ECDC4', fontWeight: 'bold', fontSize: 20 }}>{phase}</Text>
    </View>
  );
}
