import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { authService } from '../../services/authService';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>خروج از حساب کاربری</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  logoutButton: { backgroundColor: '#ef4444', padding: 15, borderRadius: 8, alignItems: 'center' },
  logoutText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});