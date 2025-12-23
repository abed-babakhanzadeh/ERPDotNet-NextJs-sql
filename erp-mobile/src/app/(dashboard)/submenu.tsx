import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

// داده‌های منو
const MENU_DATA: any = {
  'general': [
    { label: 'مدیریت کاربران', icon: 'people', route: '/(dashboard)/features/users', color: '#3b82f6' },
    { label: 'مدیریت نقش‌ها', icon: 'shield-checkmark', route: '/(dashboard)/features/roles', color: '#6366f1' },
    { label: 'تنظیمات', icon: 'settings', route: '/(dashboard)/settings', color: '#64748b' },
  ],
  'baseinfo': [
    { label: 'واحد سنجش', icon: 'scale', route: '/(dashboard)/features/units', color: '#ec4899' },
    { label: 'مدیریت کالا', icon: 'cube', route: '/(dashboard)/features/product-list', color: '#10b981' },
  ],
  'engineering': [
    { label: 'لیست BOMها', icon: 'git-network', route: '/(dashboard)/features/boms', color: '#f59e0b' },
    { label: 'گزارش مصرف', icon: 'document-text', route: '/(dashboard)/features/reports/material-usage', color: '#8b5cf6' },
  ]
};

const PAGE_TITLES: any = {
  'general': 'عمومی',
  'baseinfo': 'اطلاعات پایه',
  'engineering': 'مهندسی محصول'
};

export default function SubMenuScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const categoryId = params.id as string || 'general';
  
  const items = MENU_DATA[categoryId] || [];

  return (
    <>
      {/* هدر اختصاصی برای منو */}
      <Stack.Screen 
        options={{ 
          title: PAGE_TITLES[categoryId] || 'منو',
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.card },
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                 <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
          )
        }} 
      />

      <View style={styles.container}>
        <FlatList
          data={items}
          keyExtractor={(item) => item.label}
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(item.route)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.cardText}>{item.label}</Text>
              <Ionicons name="chevron-back" size={20} color={COLORS.textLight} style={{ marginRight: 'auto' }} />
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderRadius: 16,
    marginBottom: SPACING.s,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: '#f3f4f6'
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.m
  },
  cardText: { fontSize: 15, fontWeight: '600', color: COLORS.text }
});