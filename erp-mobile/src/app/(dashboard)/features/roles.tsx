import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
// import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { modulesService, Role } from '../../../services/modulesService';
import { COLORS, SHADOWS, SPACING } from '../../../constants/theme';

export default function RolesScreen() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await modulesService.getRoles();
      // هندل کردن فرمت‌های مختلف
      const items = Array.isArray(data) ? data : (data.items || []);
      setRoles(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* <Stack.Screen options={{ title: 'مدیریت نقش‌ها' }} /> */}
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={roles}
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.secondary} />
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.title}>{item.title || item.name}</Text>
                  <Text style={styles.subtitle}>کد سیستمی: {item.name}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>نقشی یافت نشد.</Text>}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.m },
  card: {
    ...SHADOWS.small, backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.m,
    marginBottom: SPACING.s, flexDirection: 'row-reverse', alignItems: 'center'
  },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, textAlign: 'right' },
  subtitle: { fontSize: 12, color: COLORS.textLight, textAlign: 'right', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 20, color: COLORS.textLight }
});