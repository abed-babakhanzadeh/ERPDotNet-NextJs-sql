import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions, 
  BackHandler, 
  ToastAndroid, 
  Platform,
  StatusBar
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING } from '../../constants/theme';

const { width } = Dimensions.get('window');
// محاسبه عرض کارت‌ها: (کل صفحه - (فاصله چپ + فاصله راست + فاصله وسط)) تقسیم بر ۲
const CARD_SIZE = (width - (SPACING.m * 3)) / 2;

// منوهای اصلی (ماژول‌ها)
const MAIN_CATEGORIES = [
  { 
    id: 'general', 
    title: 'عمومی', 
    subtitle: 'کاربران، نقش‌ها، تنظیمات',
    icon: 'grid', 
    color: '#3b82f6' 
  },
  { 
    id: 'baseinfo', 
    title: 'اطلاعات پایه', 
    subtitle: 'کالاها، واحد سنجش',
    icon: 'layers', 
    color: '#10b981' 
  },
  { 
    id: 'engineering', 
    title: 'مهندسی محصول', 
    subtitle: 'BOM، گزارشات',
    icon: 'construct', 
    color: '#f59e0b' 
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [exitApp, setExitApp] = useState(false);

  // --- منطق خروج با دو بار زدن دکمه Back (فقط در اندروید و فقط در صفحه خانه) ---
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (Platform.OS === 'android') {
          if (exitApp) {
            BackHandler.exitApp(); // خروج واقعی
            return true;
          } else {
            setExitApp(true);
            ToastAndroid.show('برای خروج دوباره دکمه بازگشت را بزنید', ToastAndroid.SHORT);
            
            // اگر تا ۲ ثانیه دکمه را نزند، وضعیت ریست می‌شود
            setTimeout(() => setExitApp(false), 2000);
            return true; // جلوگیری از رفتار پیش‌فرض (برگشتن به لاگین)
          }
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [exitApp])
  );

  return (
    <View style={styles.mainContainer}>
      {/* تنظیم هدر اختصاصی برای صفحه خانه.
        چون در _layout اصلی هدر را مخفی کردیم، اینجا دوباره آن را می‌سازیم
        تا ظاهر "ثابت" داشته باشد.
      */}
      <Stack.Screen 
        options={{ 
          title: 'پیشخوان',
          headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: { 
            backgroundColor: COLORS.card,
            elevation: 0, // حذف سایه برای اندروید (سایه دستی می‌دهیم)
            shadowOpacity: 0, 
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border
          },
          headerTitleStyle: { 
            fontWeight: 'bold', 
            color: COLORS.text,
            fontSize: 18 
          },
          // در صفحه خانه دکمه "بازگشت" نباید باشد
          headerLeft: () => null,
        }} 
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* کارت خوش‌آمدگویی (Dashboard Widget) */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>سیستم مدیریت یکپارچه</Text>
            <Text style={styles.welcomeSub}>وضعیت ارتباط با سرور: <Text style={{color: COLORS.success}}>برقرار ✅</Text></Text>
          </View>
          <View style={styles.avatarContainer}>
             <Ionicons name="person-circle" size={48} color={COLORS.primary} />
          </View>
        </View>

        {/* عنوان بخش ماژول‌ها */}
        <Text style={styles.sectionTitle}>ماژول‌های عملیاتی</Text>

        {/* گرید کارت‌ها */}
        <View style={styles.grid}>
          {MAIN_CATEGORIES.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.card, { borderColor: item.color }]} // بردر رنگی همرنگ آیکون
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/(dashboard)/submenu', params: { id: item.id } })}
            >
              {/* دایره پشت آیکون */}
              <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={32} color={item.color} />
              </View>
              
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub} numberOfLines={1}>{item.subtitle}</Text>
              
              {/* دکمه کوچک پایین کارت */}
              <View style={styles.cardAction}>
                <Text style={[styles.actionText, { color: item.color }]}>ورود</Text>
                <Ionicons name="arrow-back" size={14} color={item.color} style={{ transform: [{rotate: '180deg'}] }} /> 
                {/* چون آیکون فلش چپ است، برای فارسی ۱۸۰ درجه می‌چرخانیم */}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* فضای خالی پایین برای اینکه زیر فوتر گیر نکند */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.m,
  },
  
  // استایل ویجت خوش‌آمدگویی
  welcomeCard: {
    flexDirection: 'row-reverse', // راست‌چین
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: SPACING.m,
    marginBottom: SPACING.l,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  welcomeTextContainer: {
    flex: 1,
    paddingLeft: SPACING.m,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'right',
  },
  welcomeSub: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  avatarContainer: {
    paddingLeft: 8,
  },

  // عنوان بخش
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.m,
    textAlign: 'right', // برای فارسی
    marginRight: 4,
  },

  // گرید کارت‌ها
  grid: {
    flexDirection: 'row-reverse', // چیدمان از راست به چپ
    flexWrap: 'wrap',
    gap: SPACING.m,
    justifyContent: 'flex-start', // شروع از راست
  },
  
  // کارت ماژول
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.1, // کمی بلندتر برای زیبایی
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: SPACING.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...SHADOWS.small,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: SPACING.m,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 'auto', // چسباندن به پایین کارت
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
  }
});