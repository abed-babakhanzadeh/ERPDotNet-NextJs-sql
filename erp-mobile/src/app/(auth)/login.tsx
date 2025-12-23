import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [canQuickLogin, setCanQuickLogin] = useState(false);

  useEffect(() => {
    checkSavedCreds();
  }, []);

  const checkSavedCreds = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometrics(compatible && enrolled);

    const savedUser = await SecureStore.getItemAsync('saved_username');
    const savedPass = await SecureStore.getItemAsync('saved_password');

    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
      setCanQuickLogin(true);
      
      // لاگین خودکار با اثر انگشت
      if (compatible && enrolled) {
        attemptBiometricLogin(savedUser, savedPass);
      }
    }
  };

  const attemptBiometricLogin = async (user: string, pass: string) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'ورود سریع با اثر انگشت',
      fallbackLabel: 'استفاده از رمز عبور',
    });

    if (result.success) {
      handleLogin(user, pass);
    }
  };

  const handleLogin = async (user = username, pass = password) => {
    if (!user || !pass) {
      Alert.alert("خطا", "نام کاربری و رمز عبور الزامی است");
      return;
    }

    setIsLoading(true);
    try {
      await authService.login(user, pass);
      
      if (rememberMe) {
        await SecureStore.setItemAsync('saved_username', user);
        await SecureStore.setItemAsync('saved_password', pass);
      } else {
        await SecureStore.deleteItemAsync('saved_username');
        await SecureStore.deleteItemAsync('saved_password');
      }

      router.replace('/(dashboard)/home'); 
    } catch (error: any) {
      const message = error.response?.data?.message || "نام کاربری یا رمز عبور اشتباه است";
      Alert.alert("خطا در ورود", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ورود به حساب</Text>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="نام کاربری"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <Ionicons name="person-outline" size={20} color="#666" style={{marginLeft: 10}} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput 
          style={styles.input}
          placeholder="رمز عبور"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
        />
        <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
          <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={24} color="gray" />
        </TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <View style={styles.row}>
            <Text style={styles.label}>مرا به خاطر بسپار</Text>
            <Switch 
                value={rememberMe} 
                onValueChange={setRememberMe} 
                trackColor={{ false: "#767577", true: "#81b0ff" }}
                thumbColor={rememberMe ? "#2563eb" : "#f4f3f4"}
            />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.loginButton, isLoading && { opacity: 0.7 }]} 
        onPress={() => handleLogin()}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>ورود</Text>
        )}
      </TouchableOpacity>

      {hasBiometrics && canQuickLogin && (
        <TouchableOpacity style={styles.bioButton} onPress={() => attemptBiometricLogin(username, password)}>
          <Ionicons name="finger-print" size={40} color="#2563eb" />
          <Text style={styles.bioText}>تلاش مجدد با اثر انگشت</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#f5f5f5' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: '#333' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, paddingHorizontal: 15, height: 55, elevation: 1 },
  input: { flex: 1, height: '100%', textAlign: 'right', fontSize: 16 },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  row: { flexDirection: 'row-reverse', alignItems: 'center' },
  label: { marginRight: 10, color: '#555' },
  loginButton: { backgroundColor: '#2563eb', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  bioButton: { marginTop: 30, alignItems: 'center' },
  bioText: { marginTop: 5, color: '#2563eb' }
});