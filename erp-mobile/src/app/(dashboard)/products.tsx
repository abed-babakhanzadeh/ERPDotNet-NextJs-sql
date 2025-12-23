import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, 
  TouchableOpacity, Image, TextInput, InteractionManager, Keyboard, Platform // <--- Platform اینجا اضافه شد
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Product } from '../../types/product';

export default function ProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // State ها
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  
  const BASE_URL = "http://192.168.0.241:5000";

  // --- مدیریت جستجوی لایو (Debounce) ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchProducts(1, true);
  }, [debouncedTerm]);


  // --- دریافت اطلاعات از سرور ---
  const fetchProducts = async (pageNumber: number, isRefresh = false) => {
    if (!isRefresh && (!hasMore || loadingMore)) return;

    if (pageNumber === 1 && !isRefresh && products.length === 0) setLoadingInitial(true);
    else if (pageNumber > 1) setLoadingMore(true);

    try {
      const response = await apiClient.post('/BaseInfo/Products/search', {
        pageNumber: pageNumber,
        pageSize: 15,
        searchTerm: debouncedTerm,
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
      
      const currentCount = (isRefresh ? 0 : products.length) + newItems.length;
      setHasMore(currentCount < total);

    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // --- رفع باگ فریز شدن ---
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        fetchProducts(1, true); 
      });

      return () => task.cancel();
    }, [debouncedTerm])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1, true);
  };

  const onLoadMore = () => {
    if (!loadingInitial && !loadingMore && hasMore) {
      const nextPage = Math.ceil(products.length / 15) + 1;
      fetchProducts(nextPage);
    }
  };

  const handleProductPress = (item: Product) => {
    router.push({ pathname: '/(dashboard)/product-details', params: { id: item.id } });
  };

  const clearSearch = () => {
    setSearchTerm('');
    Keyboard.dismiss();
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
          {item.latinName ? <Text style={styles.latinNameText}>{item.latinName}</Text> : null}
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

      {/* باکس جستجو */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#94a3b8" style={{ marginLeft: 8 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="جستجو (نام، کد، لاتین)..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loadingInitial && !refreshing && products.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ 
            paddingHorizontal: 16, 
            paddingTop: 10, 
            paddingBottom: 160 
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} /> : <View style={{ height: 20 }} />}
          ListEmptyComponent={
            !loadingInitial ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {searchTerm ? 'نتیجه‌ای یافت نشد.' : 'کالایی ثبت نشده است.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* دکمه افزودن */}
      <TouchableOpacity 
        style={[
            styles.fab, 
            { 
                bottom: 90 + (insets.bottom > 0 ? insets.bottom : 0) 
            }
        ]} 
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
  header: { padding: 16, paddingBottom: 10, backgroundColor: COLORS.card, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  
  searchContainer: { 
    paddingHorizontal: 16, 
    paddingBottom: 12, 
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 2,
    zIndex: 10
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 46,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  searchInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: COLORS.text,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', 
    height: '100%'
  },

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
  latinNameText: { fontSize: 11, color: '#94a3b8', textAlign: 'right', marginTop: 2, fontStyle: 'italic' },
  
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', marginTop: 10, color: COLORS.textLight },
  
  fab: {
    position: 'absolute', 
    left: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    opacity: 0.9,
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5,
    zIndex: 100,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  }
});