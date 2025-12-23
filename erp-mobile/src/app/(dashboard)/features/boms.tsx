import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
// import { Stack } from 'expo-router';
import { modulesService, BOM } from '../../../services/modulesService';
import { COLORS, SHADOWS, SPACING } from '../../../constants/theme';

export default function BOMsScreen() {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await modulesService.getBOMs();
      setBoms(data.items || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <>
      {/* <Stack.Screen options={{ title: 'ساختار محصول (BOM)' }} /> */}
      <View style={styles.container}>
        {loading ? <ActivityIndicator color={COLORS.primary} style={{marginTop: 20}} /> : (
          <FlatList
            data={boms}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={{ padding: SPACING.m }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>{item.title}</Text>
                  <View style={styles.versionBadge}><Text style={styles.versionText}>v{item.version}</Text></View>
                </View>
                <Text style={styles.product}>محصول: {item.productName}</Text>
                <Text style={styles.status}>وضعیت: {item.status}</Text>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  card: { ...SHADOWS.small, backgroundColor: COLORS.card, borderRadius: 12, padding: SPACING.m, marginBottom: SPACING.m },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, flex: 1, textAlign: 'right' },
  versionBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, borderRadius: 4 },
  versionText: { color: COLORS.primary, fontSize: 12, fontWeight: 'bold' },
  product: { fontSize: 14, color: COLORS.textLight, textAlign: 'right', marginBottom: 4 },
  status: { fontSize: 12, color: COLORS.secondary, textAlign: 'right' }
});