import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import GradientButton from '../components/GradientButton';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Register'> };

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const ok = await register(email.trim(), name.trim(), password);
    setLoading(false);
    if (!ok) Alert.alert('Error', 'An account with this email already exists');
  };

  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <Text style={styles.logo}>⚡</Text>
            <Text style={styles.appName}>FitAI</Text>
            <Text style={styles.tagline}>Start your fitness journey</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create account</Text>

            {[
              { label: 'Full Name', value: name, set: setName, placeholder: 'John Doe', type: undefined },
              { label: 'Email', value: email, set: setEmail, placeholder: 'you@example.com', type: 'email-address' as const },
              { label: 'Password', value: password, set: setPassword, placeholder: '••••••••', secure: true },
              { label: 'Confirm Password', value: confirm, set: setConfirm, placeholder: '••••••••', secure: true },
            ].map(({ label, value, set, placeholder, type, secure }) => (
              <View key={label} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#666"
                  value={value}
                  onChangeText={set}
                  keyboardType={type}
                  autoCapitalize={type === 'email-address' ? 'none' : undefined}
                  secureTextEntry={secure}
                />
              </View>
            ))}

            <GradientButton label="Create Account" onPress={handleRegister} loading={loading} style={styles.btn} />

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkRow}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 48 },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1, marginTop: 8 },
  tagline: { fontSize: 14, color: '#888', marginTop: 6 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#2a2a3e' },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: '#13131f',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  btn: { marginTop: 8 },
  linkRow: { marginTop: 20, alignItems: 'center' },
  linkText: { color: '#888', fontSize: 14 },
  link: { color: '#7c3aed', fontWeight: '700' },
});
