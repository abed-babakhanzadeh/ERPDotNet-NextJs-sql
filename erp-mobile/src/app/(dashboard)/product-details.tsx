import React, { useState, useCallback } from 'react';
import { 
  View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, 
  TouchableOpacity, Modal, Alert, Dimensions, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// FIX: استفاده از مسیر legacy برای جلوگیری از ارور
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';

import apiClient from '../../services/apiClient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Product } from '../../types/product';

const { width, height } = Dimensions.get('window');

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const BASE_URL = "http://192.168.0.241:5000";

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/BaseInfo/Products/${id}`);
      setProduct(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (id) fetchProduct();
    }, [id])
  );

  const downloadImage = async () => {
    if (!product?.imagePath) return;

    setDownloading(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('مجوز لازم است', 'برای ذخیره عکس نیاز به دسترسی گالری داریم.');
        return;
      }

      const imageUrl = `${BASE_URL}${product.imagePath}`;
      const fileName = product.imagePath.split('/').pop() || 'product-image.jpg';
      const fileUri = FileSystem.documentDirectory + fileName;

      const downloadRes = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      
      Alert.alert('موفق', 'تصویر با موفقیت در گالری ذخیره شد.');
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('خطا', 'مشکلی در دانلود تصویر پیش آمد.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;
  if (!product) return <View style={styles.center}><Text>کالا یافت نشد</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>جزئیات کالا</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => product.imagePath && setImageModalVisible(true)} activeOpacity={0.9}>
            <Image
              source={product.imagePath ? { uri: `${BASE_URL}${product.imagePath}` } : require('../../../assets/images/icon.png')}
              style={styles.image}
              resizeMode="cover"
            />
            {product.imagePath && (
                <View style={styles.zoomIcon}>
                    <Ionicons name="expand" size={16} color="#fff" />
                </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{product.name}</Text>
          {product.latinName ? <Text style={styles.subtitle}>{product.latinName}</Text> : null}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.value}>{product.code}</Text>
            <Text style={styles.label}>کد کالا:</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.value}>{product.unitName}</Text>
            <Text style={styles.label}>واحد سنجش:</Text>
          </View>
          <View style={styles.row}>
             <View style={[styles.badge, { backgroundColor: product.isActive ? '#dcfce7' : '#fee2e2' }]}>
                <Text style={{ color: product.isActive ? '#166534' : '#991b1b', fontSize: 12 }}>
                  {product.isActive ? 'فعال' : 'غیرفعال'}
                </Text>
             </View>
             <Text style={styles.label}>وضعیت:</Text>
          </View>
        </View>

        {product.descriptions ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>توضیحات</Text>
            <Text style={styles.description}>{product.descriptions}</Text>
          </View>
        ) : null}

        {product.conversions && product.conversions.length > 0 && (
          <View style={styles.card}>
             <Text style={styles.sectionHeader}>تبدیل واحدها</Text>
             {product.conversions.map((conv: any, idx: number) => (
               <View key={idx} style={styles.convRow}>
                 <Text style={styles.convText}>
                   1 {product.unitName} = {conv.factor} {conv.alternativeUnitName || 'واحد فرعی'}
                 </Text>
               </View>
             ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[
            styles.fab, 
            { bottom: 90 + (insets.bottom > 0 ? insets.bottom : 0) }
        ]} 
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/(dashboard)/product-form', params: { id: product.id } })}
      >
        <Ionicons name="pencil" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal 
        visible={imageModalVisible} 
        transparent={true} 
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalBackground}>
            <TouchableOpacity 
                style={[styles.closeModalButton, { top: insets.top + 20 }]} 
                onPress={() => setImageModalVisible(false)}
            >
                <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>

            <Image 
                source={product?.imagePath ? { uri: `${BASE_URL}${product.imagePath}` } : require('../../../assets/images/icon.png')}
                style={styles.fullScreenImage}
                resizeMode="contain"
            />

            {product?.imagePath && (
                <TouchableOpacity 
                    style={[styles.downloadButton, { bottom: insets.bottom + 40 }]} 
                    onPress={downloadImage}
                    disabled={downloading}
                >
                    {downloading ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Ionicons name="download-outline" size={24} color="#000" />
                            <Text style={styles.downloadText}>دانلود تصویر</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 15, backgroundColor: COLORS.card, elevation: 2
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  backButton: { padding: 5 },
  content: { padding: 16, paddingBottom: 160 },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  image: { width: 120, height: 120, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  zoomIcon: { position: 'absolute', bottom: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 4 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, ...SHADOWS.small },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text, textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 15 },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 14, color: COLORS.textLight },
  value: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, textAlign: 'right' },
  description: { fontSize: 14, color: COLORS.text, lineHeight: 22, textAlign: 'right' },
  convRow: { padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 5 },
  convText: { fontSize: 14, color: '#334155', textAlign: 'center' },
  
  fab: {
    position: 'absolute', 
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
  },

  modalBackground: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  fullScreenImage: { width: width, height: height * 0.7 },
  closeModalButton: { position: 'absolute', right: 20, zIndex: 10, padding: 10 },
  downloadButton: {
      position: 'absolute', 
      flexDirection: 'row-reverse',
      alignItems: 'center', 
      backgroundColor: '#fff', 
      paddingHorizontal: 20, 
      paddingVertical: 12, 
      borderRadius: 30,
      gap: 8
  },
  downloadText: { fontWeight: 'bold', color: '#000' }
});