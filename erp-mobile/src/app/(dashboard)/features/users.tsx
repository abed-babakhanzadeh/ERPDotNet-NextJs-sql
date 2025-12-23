import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modulesService, User } from '../../../services/modulesService';
import { COLORS, SHADOWS, SPACING } from '../../../constants/theme';

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      const data = await modulesService.getUsers(searchTerm);
      if (Array.isArray(data)) setUsers(data);
      else if (data.items) setUsers(data.items);
      else setUsers([]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      loadData();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={styles.card}>
      <View style={styles.avatarContainer}>
        <Ionicons name="person" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.email}>{item.fullName || item.email || 'کاربر سیستم'}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' }]}>
         <Text style={{ color: item.isActive ? '#166534' : '#991b1b', fontSize: 10 }}>
            {item.isActive ? 'فعال' : 'غیرفعال'}
         </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} style={{ marginLeft: 8 }} />
        <TextInput 
          style={styles.searchInput}
          placeholder="جستجوی کاربر..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          // ✅ فاصله ۱۲۰ پیکسلی از پایین (دیگر زیر فوتر نمی‌ماند)
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={<Text style={styles.empty}>کاربری یافت نشد.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: SPACING.m,
    marginBottom: 0,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    height: 50
  },
  searchInput: { flex: 1, textAlign: 'right', height: '100%', fontSize: 16 },
  card: {
    ...SHADOWS.small,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.s,
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
    marginLeft: SPACING.m
  },
  infoContainer: { flex: 1, alignItems: 'flex-end' },
  username: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  email: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  statusBadge: { padding: 4, borderRadius: 8, marginRight: 8 },
  empty: { textAlign: 'center', marginTop: 30, color: COLORS.textLight }
});