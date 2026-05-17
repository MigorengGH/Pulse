import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSignalEngine } from '../lib/SignalEngine';
import { loadOnboardingComplete } from '../lib/storage';
import { useAuraStore } from '../store/useAuraStore';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import '../global.css';

export default function RootLayout() {
  useSignalEngine();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [isReady, setIsReady] = useState(false);
  const onboardingComplete = useAuraStore(s => s.onboardingComplete);
  const setOnboardingComplete = useAuraStore(s => s.setOnboardingComplete);
  const router = useRouter();
  const segments = useSegments();

  // Load persisted onboarding state once on mount
  useEffect(() => {
    loadOnboardingComplete().then(complete => {
      setOnboardingComplete(complete);
      setIsReady(true);
    });
  }, []);

  // Route based on onboarding state once we know where we are
  useEffect(() => {
    if (!isReady) return;

    const currentRoute = segments[0]; // undefined | 'onboarding' | '(tabs)' | '(modals)'
    const onOnboarding = currentRoute === 'onboarding';
    const inModals = currentRoute === '(modals)';

    if (!onboardingComplete && !onOnboarding) {
      // Always send to onboarding if not complete, regardless of current route
      router.replace('/onboarding');
    } else if (onboardingComplete && !onOnboarding && !inModals && currentRoute !== '(tabs)') {
      // Only redirect to tabs if we're stuck at the root with no screen
      router.replace('/(tabs)');
    }
  }, [isReady, onboardingComplete, segments]);

  // Show nothing until we know the onboarding state and fonts are ready
  if (!isReady || !fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="(modals)/nudge"
        options={{ presentation: 'transparentModal', animation: 'fade' }}
      />
    </Stack>
  );
}
