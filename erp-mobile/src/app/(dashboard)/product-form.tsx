import React, { useState, useCallback, useRef } from 'react';
import { 
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, Alert, Switch, Modal, FlatList, Image, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../../services/apiClient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { Unit } from '../../types/baseInfo';

interface ConversionRow {
  id: number;
  alternativeUnitId: number | string;
  factor: string;
}

export default function ProductFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const productId = params.id ? Number(params.id) : null;
  const isEditing = !!productId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  
  // Form State
  const [name, setName] = useState('');
  const [latinName, setLatinName] = useState('');
  const [code, setCode] = useState('');
  const [unitId, setUnitId] = useState<number | null>(null);
  const [supplyType, setSupplyType] = useState(1);
  const [descriptions, setDescriptions] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [rowVersion, setRowVersion] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [serverImagePath, setServerImagePath] = useState<string | null>(null);

  // Modals
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [currentConversionIndex, setCurrentConversionIndex] = useState<number | null>(null);

  const BASE_URL = "http://192.168.0.241:5000";

  useFocusEffect(
    useCallback(() => {
      if (!productId) {
        resetForm();
        loadUnits();
      } else {
        loadData();
      }
    }, [productId])
  );

  const resetForm = () => {
    setName('');
    setLatinName('');
    setCode('');
    setUnitId(null);
    setSupplyType(1);
    setDescriptions('');
    setIsActive(true);
    setConversions([]);
    setRowVersion('');
    setImageUri(null);
    setServerImagePath(null);
    setLoading(false);
  };

  const loadUnits = async () => {
    try {
      const unitsRes = await apiClient.get('/BaseInfo/Units/lookup');
      setUnits(unitsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadUnits();
      if (productId) {
        const productRes = await apiClient.get(`/BaseInfo/Products/${productId}`);
        const p = productRes.data;
        
        setName(p.name);
        setLatinName(p.latinName || '');
        setCode(p.code);
        setUnitId(p.unitId);
        setSupplyType(p.supplyTypeId || p.supplyType || 1);
        setDescriptions(p.descriptions || '');
        setIsActive(p.isActive);
        setRowVersion(p.rowVersion);
        setServerImagePath(p.imagePath);

        if (p.conversions) {
          setConversions(p.conversions.map((c: any) => ({
            id: c.id,
            alternativeUnitId: c.alternativeUnitId,
            factor: c.factor.toString()
          })));
        }
      }
    } catch (error) {
      Alert.alert('خطا', 'دریافت اطلاعات با مشکل مواجه شد');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("دسترسی لازم است", "برای انتخاب عکس باید دسترسی به گالری را تایید کنید.");
      return;
    }

    try {
      // FIX: استفاده از رشته 'images' به جای Enum که باعث خطا می‌شد
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images', 
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("ImagePicker Error:", error);
      Alert.alert("خطا", "انتخاب عکس با مشکل مواجه شد.");
    }
  };

  const handleSave = async () => {
    if (!name || !code || !unitId) {
      Alert.alert('خطا', 'لطفا نام، کد و واحد اصلی را وارد کنید.');
      return;
    }
    setSaving(true);
    try {
      let finalImagePath = serverImagePath;
      
      if (imageUri) {
        const formData = new FormData();
        const uriParts = imageUri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        const fileToUpload = {
          uri: Platform.OS === 'android' ? imageUri : imageUri.replace('file://', ''),
          type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
          name: `photo.${fileType}`,
        };

        // @ts-ignore
        formData.append('file', fileToUpload);

        const uploadRes = await apiClient.post('/Upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        finalImagePath = uploadRes.data.path;
      }

      const payload = {
        id: productId || 0,
        name,
        latinName,
        code,
        unitId: Number(unitId),
        supplyType: Number(supplyType),
        descriptions,
        isActive,
        rowVersion,
        imagePath: finalImagePath,
        conversions: conversions
          .filter(c => c.alternativeUnitId && Number(c.factor) > 0)
          .map(c => ({
            id: c.id || 0,
            alternativeUnitId: Number(c.alternativeUnitId),
            factor: Number(c.factor)
          }))
      };

      if (isEditing) {
        await apiClient.put(`/BaseInfo/Products/${productId}`, payload);
        Alert.alert('موفق', 'تغییرات ذخیره شد.', [{ text: 'باشه', onPress: () => router.back() }]);
      } else {
        await apiClient.post('/BaseInfo/Products', payload);
        Alert.alert('موفق', 'کالای جدید ایجاد شد.', [{ text: 'باشه', onPress: () => router.back() }]);
      }
    } catch (error: any) {
      const msg = error.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join('\n') 
        : 'خطا در ذخیره سازی';
      Alert.alert('خطا', msg);
    } finally {
      setSaving(false);
    }
  };

  const addConversion = () => {
    setConversions([...conversions, { id: 0, alternativeUnitId: '', factor: '' }]);
    // با کمی تاخیر اسکرول کن تا فیلد جدید دیده شود
    setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
  };

  const removeConversion = (index: number) => {
    const newConversions = [...conversions];
    newConversions.splice(index, 1);
    setConversions(newConversions);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary}/></View>;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header - Outside KeyboardAvoidingView to stay fixed at top */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'ویرایش کالا' : 'کالای جدید'}</Text>
          <View style={{width: 24}} /> 
      </View>

      {/* Main Content & Footer inside KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={0} // چون هدر خارج است، آفست نیاز نیست
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.container} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker} activeOpacity={0.8}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : serverImagePath ? (
                <Image source={{ uri: `${BASE_URL}${serverImagePath}` }} style={styles.imagePreview} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.iconCircle}>
                       <Ionicons name="camera" size={28} color={COLORS.primary} />
                  </View>
                  <Text style={styles.imageText}>تصویر</Text>
                </View>
              )}
              {(imageUri || serverImagePath) && (
                  <View style={styles.editIconBadge}>
                      <Ionicons name="pencil" size={12} color="#fff" />
                  </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>مشخصات</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="نام کالا *" />
            <TextInput style={styles.input} value={latinName} onChangeText={setLatinName} placeholder="نام لاتین" />
            
            <View style={styles.row}>
              <View style={{flex: 1, marginLeft: 8}}>
                  <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="کد *" />
              </View>
              <View style={{flex: 1}}>
                  <TouchableOpacity 
                      style={styles.selectBox} 
                      onPress={() => { setCurrentConversionIndex(null); setUnitModalVisible(true); }}
                  >
                      <Text style={{color: unitId ? COLORS.text : '#aaa', fontSize: 13}}>
                          {units.find(u => u.id === unitId)?.title || 'واحد اصلی *'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#666" />
                  </TouchableOpacity>
              </View>
            </View>

            <TextInput 
              style={[styles.input, {height: 80}]} 
              value={descriptions} 
              onChangeText={setDescriptions} 
              multiline 
              placeholder="توضیحات تکمیلی..."
              textAlignVertical="top" 
            />

            <View style={styles.switchRow}>
               <Text style={styles.label}>وضعیت فعال</Text>
               <Switch value={isActive} onValueChange={setIsActive} trackColor={{false: '#e2e8f0', true: '#bbf7d0'}} thumbColor={isActive ? '#16a34a' : '#f1f5f9'} />
            </View>
          </View>

          <View style={styles.section}>
              <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>واحدهای فرعی</Text>
                  <TouchableOpacity onPress={addConversion} style={styles.addButton}>
                      <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                      <Text style={styles.addButtonText}>افزودن</Text>
                  </TouchableOpacity>
              </View>

              {conversions.length === 0 ? (
                   <Text style={styles.emptyText}>واحد فرعی تعریف نشده است.</Text>
              ) : (
                  conversions.map((item, index) => (
                      <View key={index} style={styles.conversionRow}>
                          <TouchableOpacity 
                              style={[styles.selectBox, {flex: 1, height: 45, marginBottom: 0}]}
                              onPress={() => { setCurrentConversionIndex(index); setUnitModalVisible(true); }}
                          >
                               <Text style={{fontSize: 12}}>
                                  {units.find(u => u.id == item.alternativeUnitId)?.title || 'انتخاب واحد'}
                              </Text>
                          </TouchableOpacity>
                          <Text style={{marginHorizontal: 8, fontWeight: 'bold', color: '#64748b'}}>=</Text>
                          <TextInput 
                              style={[styles.input, {width: 70, marginBottom: 0, textAlign: 'center', height: 45}]} 
                              value={item.factor}
                              onChangeText={(text) => {
                                  const newArr = [...conversions];
                                  newArr[index].factor = text;
                                  setConversions(newArr);
                              }}
                              keyboardType="numeric"
                              placeholder="ضریب"
                          />
                          <TouchableOpacity onPress={() => removeConversion(index)} style={{padding: 8}}>
                              <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                      </View>
                  ))
              )}
          </View>
        </ScrollView>

        {/* Footer Buttons - Inside KeyboardAvoidingView to move up with keyboard */}
        <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
            <TouchableOpacity 
                style={[styles.cancelButton, saving && {opacity: 0.5}]} 
                onPress={() => router.back()}
                disabled={saving}
            >
                <Text style={styles.cancelButtonText}>انصراف</Text>
            </TouchableOpacity>
            
            <View style={{width: 12}} />

            <TouchableOpacity 
                style={[styles.saveButton, saving && {opacity: 0.5}]} 
                onPress={handleSave}
                disabled={saving}
            >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>ذخیره اطلاعات</Text>
                )}
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal */}
      <Modal visible={unitModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>انتخاب واحد</Text>
                <TouchableOpacity onPress={() => setUnitModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
            </View>
            <FlatList
              data={units}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                      if (currentConversionIndex !== null) {
                          const newConv = [...conversions];
                          newConv[currentConversionIndex].alternativeUnitId = item.id;
                          setConversions(newConv);
                      } else {
                          setUnitId(item.id);
                      }
                      setUnitModalVisible(false);
                      setCurrentConversionIndex(null);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.title}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
      flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
      padding: 16, backgroundColor: COLORS.card, elevation: 3, borderBottomWidth: 1, borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  // فضای پایین کمتر شده چون دکمه‌ها داخل کیبورد-ویو هستند
  container: { padding: 16, paddingBottom: 20 }, 
  section: { backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16, ...SHADOWS.small },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.primary, textAlign: 'right' },
  label: { fontSize: 13, color: COLORS.textLight, marginBottom: 6, textAlign: 'right' },
  input: { 
      borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 14, textAlign: 'right', backgroundColor: '#fff', marginBottom: 12, color: COLORS.text
  },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  selectBox: {
      borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 12,
      backgroundColor: '#fff', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', height: 50, marginBottom: 12
  },
  switchRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  
  // استایل فوتر ثابت در پایین
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 16,
    flexDirection: 'row-reverse', // راست چین
    alignItems: 'center',
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  saveButton: {
      backgroundColor: COLORS.primary, 
      borderRadius: 12, 
      height: 50,
      alignItems: 'center', 
      justifyContent: 'center',
      flex: 3, // نسبت ۳ (بزرگتر)
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1, // نسبت ۱ (کوچکتر)
    borderWidth: 1,
    borderColor: '#ef4444'
  },
  cancelButtonText: { color: '#ef4444', fontSize: 14, fontWeight: 'bold' },

  imageSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  imagePicker: { 
      width: 110, height: 110, borderRadius: 22, backgroundColor: '#fff', 
      justifyContent: 'center', alignItems: 'center', overflow: 'hidden', 
      borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed'
  },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  imageText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  editIconBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  addButton: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, padding: 4 },
  addButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  conversionRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10, backgroundColor: '#f8fafc', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 0, maxHeight: '70%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  modalItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc', flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 15, color: COLORS.text },
});