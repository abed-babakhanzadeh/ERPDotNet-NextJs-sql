import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Product } from '../../types/product';

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const BASE_URL = "http://192.168.0.241:5000";

  const fetchProducts = async (pageNumber: number, isRefresh = false) => {
    if (!isRefresh && (!hasMore || loadingMore)) return;

    if (pageNumber === 1) setLoadingInitial(true);
    else setLoadingMore(true);

    try {
      const response = await apiClient.post('/BaseInfo/Products/search', {
        pageNumber: pageNumber,
        pageSize: 15,
        searchTerm: "",
        sortColumn: 'id',
        sortDescending: true,
        filters: []
      });

      const newItems = response.data.items || [];
      const total = response.data.totalCount || 0;

      if (isRefresh || pageNumber === 1) {
        setProducts(newItems);
      } else {
        setProducts(prev => [...prev, ...newItems]);
      }
      setHasMore(((isRefresh ? 0 : products.length) + newItems.length) < total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts(1, true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1, true);
  };

  const onLoadMore = () => {
    if (!loadingInitial && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  const handleProductPress = (item: Product) => {
    router.push({ pathname: '/(dashboard)/product-details', params: { id: item.id } });
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9} 
      onPress={() => handleProductPress(item)}
    >
      <View style={styles.cardContent}>
        <Image
           source={item.imagePath ? { uri: `${BASE_URL}${item.imagePath}` } : require('../../../assets/images/icon.png')} 
           style={styles.productImage}
        />
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: item.isActive ? '#dcfce7' : '#fee2e2' }]}>
               <Text style={{ color: item.isActive ? '#166534' : '#991b1b', fontSize: 10 }}>
                 {item.isActive ? 'فعال' : 'غیر'}
               </Text>
            </View>
          </View>
          <Text style={styles.detailText}>کد: {item.code}</Text>
          <Text style={styles.unitText}>{item.unitName}</Text>
        </View>
        <Ionicons name="chevron-back" size={20} color={COLORS.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>لیست کالاها</Text>
      </View>

      {loadingInitial && !refreshing ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          // پدینگ پایین زیاد برای جلوگیری از رفتن زیر تب‌بار
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 160 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 20 }} />}
          ListEmptyComponent={<Text style={styles.emptyText}>کالایی یافت نشد.</Text>}
        />
      )}

      {/* دکمه شناور افزودن */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.7}
        onPress={() => router.push('/(dashboard)/product-form')}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, backgroundColor: COLORS.card, elevation: 2, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  cardContent: { flexDirection: 'row-reverse', padding: 12, alignItems: 'center' },
  productImage: { width: 60, height: 60, borderRadius: 12, marginLeft: 12, backgroundColor: '#f1f5f9' },
  textContainer: { flex: 1, justifyContent: 'center' },
  headerRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  productName: { fontSize: 15, fontWeight: 'bold', color: COLORS.text, flex: 1, textAlign: 'right', marginLeft: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  detailText: { fontSize: 12, color: COLORS.textLight, textAlign: 'right', marginTop: 2 },
  unitText: { fontSize: 12, color: COLORS.textLight, textAlign: 'right', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 50, color: COLORS.textLight },
  
  // دکمه شناور
  fab: {
    position: 'absolute', 
    bottom: 90, // بالاتر از تب‌بار
    left: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    opacity: 0.6,
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5,
    zIndex: 100
  }
});