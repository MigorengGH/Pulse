import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { useAuraStore } from '../../store/useAuraStore';
import NudgeBanner from '../../components/NudgeBanner';
import { Ionicons } from '@expo/vector-icons';
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
            fontFamily: 'PlusJakartaSans_600SemiBold',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="patterns"
          options={{
            title: 'Patterns',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Pulse',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={22} color={color} />
            )
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
            )
          }}
        />
      </Tabs>
    </View>
  );
}
