import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
// import { Stack } from 'expo-router';
import { modulesService, Unit } from '../../../services/modulesService';
import { COLORS, SHADOWS, SPACING } from '../../../constants/theme';

export default function UnitsScreen() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await modulesService.getUnits();
      const items = Array.isArray(data) ? data : (data.items || []);
      setUnits(items);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  return (
    <>
      {/* <Stack.Screen options={{ title: 'واحدهای سنجش' }} /> */}
      <View style={styles.container}>
        {loading ? <ActivityIndicator color={COLORS.primary} /> : (
          <FlatList
            data={units}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.title}>{item.title}</Text>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.m },
  card: {
    ...SHADOWS.small, backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.m,
    marginBottom: SPACING.s, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'
  },
  title: { fontSize: 16, fontWeight: 'bold', color: COLORS.text },
  symbol: { fontSize: 14, color: COLORS.primary, backgroundColor: '#eff6ff', padding: 5, borderRadius: 4 }
});