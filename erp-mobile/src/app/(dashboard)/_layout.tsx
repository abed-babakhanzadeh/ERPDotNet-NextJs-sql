import React, { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { COLORS } from '../../constants/theme';

export default function DashboardLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setBackgroundColorAsync('#ffffff00');
    }
  }, []);

  const CustomBackButton = () => (
    <TouchableOpacity 
      onPress={() => router.back()} 
      style={{ marginLeft: 15, padding: 5 }}
    >
      <Ionicons name="arrow-back" size={24} color={COLORS.text} />
    </TouchableOpacity>
  );

  return (
    <Tabs 
      backBehavior="history"
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: { 
          direction: 'rtl',
          position: 'absolute', 
          backgroundColor: COLORS.card,
          borderTopWidth: 0,
          elevation: 10, 
          height: 65 + (insets.bottom > 0 ? insets.bottom : 10), 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen 
        name="home" 
        options={{ 
          title: 'پیشخوان',
          tabBarLabel: 'خانه',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }} 
      />

      <Tabs.Screen 
        name="products" 
        options={{ 
          title: 'مدیریت کالاها',
          tabBarLabel: 'کالاها',
          tabBarIcon: ({ color }) => <Ionicons name="cube-outline" size={24} color={color} />,
        }} 
      />

      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: 'تنظیمات',
          tabBarLabel: 'تنظیمات',
          tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={24} color={color} />,
        }} 
      />

      {/* --- صفحات مخفی (بدون دکمه در فوتر) --- */}
      
      <Tabs.Screen 
        name="product-form" 
        options={{ 
          href: null, // این خط دکمه را از نوار پایین حذف می‌کند
          tabBarStyle: { display: 'none' }, // وقتی در فرم هستیم، کل نوار پایین مخفی شود
          headerShown: false
        }} 
      />

      <Tabs.Screen 
        name="product-details" 
        options={{ 
          href: null,
          headerShown: false
        }} 
      />

      <Tabs.Screen 
        name="submenu" 
        options={{ 
          href: null,
          headerShown: true,
          headerTitle: 'منو',
          headerLeft: () => <CustomBackButton />,
        }} 
      />

      <Tabs.Screen name="features/users" options={{ href: null }} />
      <Tabs.Screen name="features/roles" options={{ href: null }} />
      <Tabs.Screen name="features/units" options={{ href: null }} />
      <Tabs.Screen name="features/product-list" options={{ href: null }} />
      <Tabs.Screen name="features/boms" options={{ href: null }} />
      <Tabs.Screen name="features/reports/material-usage" options={{ href: null }} />
    </Tabs>
  );
}