import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { modulesService, WhereUsedItem, BOM } from '../../../../services/modulesService';
import { COLORS, SHADOWS, SPACING } from '../../../../constants/theme';

export default function MaterialUsageReport() {
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [reportData, setReportData] = useState<WhereUsedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // استیت‌های مربوط به مودال انتخاب BOM
  const [modalVisible, setModalVisible] = useState(false);
  const [bomsList, setBomsList] = useState<BOM[]>([]);
  const [filteredBoms, setFilteredBoms] = useState<BOM[]>([]);
  const [bomSearch, setBomSearch] = useState('');
  const [loadingBoms, setLoadingBoms] = useState(false);

  // دریافت لیست BOMها برای پر کردن کمبو
  useEffect(() => {
    loadBOMs();
  }, []);

  const loadBOMs = async () => {
    setLoadingBoms(true);
    try {
      // دریافت لیست اولیه (مثلا 100 تا) برای نمایش در لیست
      const data = await modulesService.getBOMs(""); 
      const items = data.items || [];
      setBomsList(items);
      setFilteredBoms(items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBoms(false);
    }
  };

  // فیلتر کردن لیست داخل مودال
  const handleFilterBOMs = (text: string) => {
    setBomSearch(text);
    if (!text) {
      setFilteredBoms(bomsList);
    } else {
      const filtered = bomsList.filter(item => 
        item.title.toLowerCase().includes(text.toLowerCase()) || 
        item.productName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredBoms(filtered);
    }
  };

  const handleSelectBOM = (bom: BOM) => {
    setSelectedBOM(bom);
    setModalVisible(false);
    // به محض انتخاب، گزارش را بگیر
    fetchReport(bom.id);
  };

  const fetchReport = async (id: number) => {
    setLoading(true);
    setSearched(true);
    try {
      const data = await modulesService.getMaterialUsage(id);
      setReportData(data.items || []);
    } catch (error) {
      console.error(error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const renderReportItem = ({ item }: { item: WhereUsedItem }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{item.productName}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>سطح {item.level}</Text>
        </View>
      </View>
      <Text style={styles.subText}>BOM مرتبط: {item.bomTitle}</Text>
      <View style={styles.footer}>
        <Text style={styles.quantity}>تعداد: {item.quantity} {item.unit}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'گزارش مصرف مواد' }} />
      <View style={styles.container}>
        
        {/* کمبو باکس انتخاب BOM */}
        <View style={styles.filterSection}>
          <Text style={styles.label}>انتخاب BOM (قطعه/فرمول):</Text>
          <TouchableOpacity 
            style={styles.dropdownBtn} 
            onPress={() => setModalVisible(true)}
          >
            <Text style={[styles.dropdownText, !selectedBOM && { color: '#999' }]}>
              {selectedBOM ? `${selectedBOM.title} (${selectedBOM.productName})` : 'انتخاب کنید...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* لیست نتایج گزارش */}
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={reportData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderReportItem}
            contentContainerStyle={{ padding: SPACING.m }}
            ListEmptyComponent={
              searched ? (
                <Text style={styles.empty}>موردی یافت نشد.</Text>
              ) : (
                <Text style={styles.empty}>لطفاً یک BOM را از لیست بالا انتخاب کنید.</Text>
              )
            }
          />
        )}

        {/* مودال انتخاب BOM (شبیه کمبوباکس وب) */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>جستجوی BOM</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color={COLORS.danger} />
              </TouchableOpacity>
            </View>

            {/* کادر سرچ داخل مودال */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput 
                style={styles.modalInput}
                placeholder="جستجو در نام قطعه یا محصول..."
                value={bomSearch}
                onChangeText={handleFilterBOMs}
                autoFocus
              />
            </View>

            {loadingBoms ? (
               <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList 
                data={filteredBoms}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectBOM(item)}>
                    <Text style={styles.modalItemTitle}>{item.title}</Text>
                    <Text style={styles.modalItemSub}>{item.productName} - {item.version}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>نتیجه‌ای یافت نشد.</Text>}
              />
            )}
          </SafeAreaView>
        </Modal>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterSection: {
    backgroundColor: COLORS.card,
    padding: SPACING.m,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    ...SHADOWS.small
  },
  label: { marginBottom: 8, color: COLORS.text, fontWeight: 'bold', textAlign: 'right' },
  dropdownBtn: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  dropdownText: { fontSize: 14, color: COLORS.text, flex: 1, textAlign: 'right' },
  
  // استایل کارت گزارش
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  badge: { backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  subText: { textAlign: 'right', color: COLORS.textLight, marginBottom: 8 },
  footer: { flexDirection: 'row-reverse', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  quantity: { fontWeight: 'bold', color: COLORS.secondary },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textLight },

  // استایل مودال
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalSearchBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9f9f9', margin: 16, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  modalInput: { flex: 1, textAlign: 'right', marginRight: 10, fontSize: 16, height: 40 },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', color: '#333' },
  modalItemSub: { fontSize: 13, color: '#666', textAlign: 'right', marginTop: 4 }
});