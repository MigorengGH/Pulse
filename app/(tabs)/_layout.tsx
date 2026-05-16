import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuraStore } from '../../store/useAuraStore';
import NudgeBanner from '../../components/NudgeBanner';
import { Colors } from '../../constants/colors';

export default function TabLayout() {
  const showNudge = useAuraStore(state => state.showNudgeBanner);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {showNudge && <NudgeBanner />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: Colors.bgBorder,
            borderTopWidth: 1,
            elevation: 0,
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: 'Home', tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }}
        />
        <Tabs.Screen
          name="patterns"
          options={{ title: 'Patterns', tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text> }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: 'Pulse', tabBarIcon: () => <Text style={{ fontSize: 22 }}>💬</Text> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text> }}
        />
      </Tabs>
    </View>
  );
}
