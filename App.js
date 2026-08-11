import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView,
  Alert, KeyboardAvoidingView, Platform, Modal, ActivityIndicator,
  RefreshControl, SafeAreaView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash = hash & hash;
  }
  return hash.toString(36);
}

async function registerUser(email, name, password) {
  const raw = await AsyncStorage.getItem('fitai_users');
  const users = raw ? JSON.parse(raw) : [];
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return null;
  const user = { id: Date.now().toString(), email, name, passwordHash: simpleHash(password), createdAt: new Date().toISOString() };
  users.push(user);
  await AsyncStorage.setItem('fitai_users', JSON.stringify(users));
  return user;
}

async function loginUser(email, password) {
  const raw = await AsyncStorage.getItem('fitai_users');
  const users = raw ? JSON.parse(raw) : [];
  return users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password)) || null;
}

async function saveCurrentUser(user) { await AsyncStorage.setItem('fitai_current_user', JSON.stringify(user)); }
async function getCurrentUser() { const r = await AsyncStorage.getItem('fitai_current_user'); return r ? JSON.parse(r) : null; }
async function clearCurrentUser() { await AsyncStorage.removeItem('fitai_current_user'); }

async function saveRoutine(userId, routine) {
  const key = `fitai_routines_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  const list = raw ? JSON.parse(raw) : [];
  list.unshift(routine);
  await AsyncStorage.setItem(key, JSON.stringify(list.slice(0, 20)));
}
async function getRoutines(userId) { const r = await AsyncStorage.getItem(`fitai_routines_${userId}`); return r ? JSON.parse(r) : []; }

async function saveSession(userId, session) {
  const key = `fitai_sessions_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  const list = raw ? JSON.parse(raw) : [];
  list.unshift(session);
  await AsyncStorage.setItem(key, JSON.stringify(list));
}
async function getSessions(userId) { const r = await AsyncStorage.getItem(`fitai_sessions_${userId}`); return r ? JSON.parse(r) : []; }

async function generateRoutine(goal, equipment, apiKey) {
  const prompt = `You are a professional personal trainer. Create a detailed 30-minute workout routine.\n\nUser's goal: ${goal}\nAvailable equipment: ${equipment}\n\nRespond with ONLY valid JSON, no markdown:\n{\n  "title": "Workout title",\n  "warmup": [{"name":"Exercise","sets":1,"reps":"30 seconds","rest":"10s","muscle":"Full body","instructions":"How to do it"}],\n  "exercises": [{"name":"Exercise","sets":3,"reps":"10-12","rest":"60s","muscle":"Target muscle","instructions":"How to do it"}],\n  "cooldown": [{"name":"Stretch","sets":1,"reps":"30 seconds","rest":"0s","muscle":"Target muscle","instructions":"How to do it"}]\n}\nInclude 2-3 warmup, 5-7 main exercises, 2-3 cooldown. Fit in 30 minutes.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in response');
  const parsed = JSON.parse(match[0]);
  return { id: Date.now().toString(), title: parsed.title || 'Custom Workout', goal, equipment, duration: 30, warmup: parsed.warmup || [], exercises: parsed.exercises || [], cooldown: parsed.cooldown || [], createdAt: new Date().toISOString() };
}

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getCurrentUser().then(u => { setUser(u); setLoading(false); }); }, []);
  const login = async (email, password) => { const u = await loginUser(email, password); if (u) { await saveCurrentUser(u); setUser(u); return true; } return false; };
  const register = async (email, name, password) => { const u = await registerUser(email, name, password); if (u) { await saveCurrentUser(u); setUser(u); return true; } return false; };
  const logout = async () => { await clearCurrentUser(); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
function useAuth() { return useContext(AuthContext); }

function Btn({ label, onPress, loading, secondary, style }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} style={[{ borderRadius: 14, overflow: 'hidden' }, style]} activeOpacity={0.85}>
      <LinearGradient colors={secondary ? ['#2d2d3a', '#1e1e2a'] : ['#7c3aed', '#4f46e5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ paddingVertical: 16, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{label}</Text>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

function Input({ label, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={{ fontSize: 13, color: '#aaa', marginBottom: 8, fontWeight: '600' }}>{label}</Text>}
      <TextInput placeholderTextColor="#555" style={{ backgroundColor: '#13131f', borderRadius: 12, padding: 15, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e' }} {...props} />
    </View>
  );
}

function ExCard({ ex, index }) {
  return (
    <View style={{ backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{index + 1}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{ex.name}</Text>
          <Text style={{ fontSize: 12, color: '#888' }}>{ex.muscle}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7c3aed' }}>{ex.sets}x{ex.reps}</Text>
          <Text style={{ fontSize: 11, color: '#666' }}>rest {ex.rest}</Text>
        </View>
      </View>
      <Text style={{ fontSize: 13, color: '#aaa', lineHeight: 18 }}>{ex.instructions}</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!email.trim() || !password.trim()) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    const ok = await login(email.trim(), password);
    setLoading(false);
    if (!ok) Alert.alert('Error', 'Invalid email or password');
  };
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <Text style={{ fontSize: 56 }}>⚡</Text>
            <Text style={{ fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 8 }}>FitAI</Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Your AI-powered fitness coach</Text>
          </View>
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 24 }}>Welcome back</Text>
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            <Btn label="Sign In" onPress={handle} loading={loading} style={{ marginTop: 8 }} />
            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: '#888' }}>Don't have an account? <Text style={{ color: '#7c3aed', fontWeight: '700' }}>Sign Up</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!name || !email || !password || !confirm) return Alert.alert('Error', 'Fill in all fields');
    if (password !== confirm) return Alert.alert('Error', 'Passwords do not match');
    if (password.length < 6) return Alert.alert('Error', 'Password must be 6+ characters');
    setLoading(true);
    const ok = await register(email.trim(), name.trim(), password);
    setLoading(false);
    if (!ok) Alert.alert('Error', 'Email already in use');
  };
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 48 }}>⚡</Text>
            <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 8 }}>FitAI</Text>
            <Text style={{ fontSize: 14, color: '#888', marginTop: 6 }}>Start your fitness journey</Text>
          </View>
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 24, padding: 28, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 }}>Create account</Text>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Input label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            <Input label="Confirm Password" value={confirm} onChangeText={setConfirm} placeholder="••••••••" secureTextEntry />
            <Btn label="Create Account" onPress={handle} loading={loading} style={{ marginTop: 8 }} />
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, alignItems: 'center' }}>
              <Text style={{ color: '#888' }}>Already have an account? <Text style={{ color: '#7c3aed', fontWeight: '700' }}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function HomeScreen() {
  const { user, logout } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    const [r, s] = await Promise.all([getRoutines(user.id), getSessions(user.id)]);
    setRoutines(r); setSessions(s);
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const thisWeek = sessions.filter(s => new Date(s.completedAt) >= weekAgo).length;
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor="#7c3aed" />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <View>
            <Text style={{ fontSize: 16, color: '#888' }}>{greeting},</Text>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 }}>{user?.name?.split(' ')[0]} 💪</Text>
          </View>
          <TouchableOpacity onPress={logout} style={{ backgroundColor: '#1e1e2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ color: '#888', fontSize: 13 }}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          <LinearGradient colors={['#7c3aed', '#4f46e5']} style={{ flex: 1.2, borderRadius: 16, padding: 16, alignItems: 'center' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff' }}>{thisWeek}</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>This week</Text>
          </LinearGradient>
          <View style={{ flex: 1, backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#7c3aed' }}>{sessions.length}</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Sessions</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: '#7c3aed' }}>{routines.length}</Text>
            <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Routines</Text>
          </View>
        </View>
        <LinearGradient colors={['#1e1e2e', '#16213e']} style={{ borderRadius: 18, padding: 20, marginBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 }}>Ready to train?</Text>
            <Text style={{ fontSize: 13, color: '#888' }}>Tap AI Coach to generate your routine</Text>
          </View>
          <Text style={{ fontSize: 36 }}>🤖</Text>
        </LinearGradient>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 }}>Recent Routines</Text>
        {routines.length === 0 ? (
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 }}>No routines yet</Text>
            <Text style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>Use the AI Coach tab to generate your first workout</Text>
          </View>
        ) : routines.slice(0, 5).map(r => (
          <View key={r.id} style={{ backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 }}>{r.title}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>{r.exercises.length} exercises · {r.duration} min</Text>
            </View>
            <View style={{ backgroundColor: '#7c3aed22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
              <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 13 }}>{r.duration}m</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

function AICoachScreen() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [goal, setGoal] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState(null);
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState(false);
  const GOALS = ['Build muscle and strength', 'Lose weight and burn fat', 'Improve cardio endurance', 'Full body toning'];
  const EQUIP = ['No equipment (bodyweight)', 'Dumbbells', 'Barbell + plates', 'Resistance bands', 'Full gym'];
  const handle = async () => {
    if (!apiKey.trim()) return Alert.alert('API Key Required', 'Enter your Anthropic API key');
    if (!goal.trim()) return Alert.alert('Missing', 'Describe your goal');
    if (!equipment.trim()) return Alert.alert('Missing', 'Describe your equipment');
    setLoading(true); setSaved(false);
    try { setRoutine(await generateRoutine(goal.trim(), equipment.trim(), apiKey.trim())); }
    catch (e) { Alert.alert('Failed', e.message); }
    finally { setLoading(false); }
  };
  const handleSave = async () => {
    if (!routine || !user) return;
    await saveRoutine(user.id, routine);
    setSaved(true);
    Alert.alert('Saved!', 'Routine saved to your library');
  };
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 }}>AI Coach 🤖</Text>
          <Text style={{ fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 20 }}>Describe your goal and equipment — get a custom 30-min routine</Text>
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 12, textTransform: 'uppercase' }}>Anthropic API Key</Text>
            <Input value={apiKey} onChangeText={setApiKey} placeholder="sk-ant-..." secureTextEntry autoCapitalize="none" />
            <Text style={{ fontSize: 11, color: '#555' }}>Used only on-device. Get one at console.anthropic.com</Text>
          </View>
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 12, textTransform: 'uppercase' }}>Your Goal</Text>
            <Input value={goal} onChangeText={setGoal} placeholder="e.g. Build upper body strength..." multiline numberOfLines={2} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOALS.map(g => (
                <TouchableOpacity key={g} onPress={() => setGoal(g)} style={{ backgroundColor: goal === g ? '#7c3aed22' : '#13131f', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: goal === g ? '#7c3aed' : '#2a2a3e' }}>
                  <Text style={{ color: goal === g ? '#7c3aed' : '#888', fontSize: 12 }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 12, textTransform: 'uppercase' }}>Equipment</Text>
            <Input value={equipment} onChangeText={setEquipment} placeholder="e.g. Dumbbells, resistance bands..." />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EQUIP.map(e => (
                <TouchableOpacity key={e} onPress={() => setEquipment(e)} style={{ backgroundColor: equipment === e ? '#7c3aed22' : '#13131f', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: equipment === e ? '#7c3aed' : '#2a2a3e' }}>
                  <Text style={{ color: equipment === e ? '#7c3aed' : '#888', fontSize: 12 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Btn label="Generate My Routine ✨" onPress={handle} loading={loading} style={{ marginBottom: 24 }} />
          {routine && (
            <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a3e' }}>
              <LinearGradient colors={['#7c3aed', '#4f46e5']} style={{ padding: 20 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 }}>{routine.title}</Text>
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{routine.duration} min · {routine.exercises.length} exercises</Text>
              </LinearGradient>
              <TouchableOpacity onPress={() => setModal(true)} style={{ margin: 16, padding: 14, backgroundColor: '#13131f', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' }}>
                <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 14 }}>View Full Routine →</Text>
              </TouchableOpacity>
              {routine.exercises.slice(0, 3).map((ex, i) => (
                <View key={i} style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 6 }}>
                  <Text style={{ color: '#7c3aed', marginRight: 8 }}>•</Text>
                  <Text style={{ color: '#ccc', fontSize: 14, flex: 1 }}>{ex.name} — {ex.sets}x{ex.reps}</Text>
                </View>
              ))}
              {!saved
                ? <Btn label="Save to Library" onPress={handleSave} style={{ margin: 16 }} />
                : <View style={{ margin: 16, backgroundColor: '#0d2b17', borderRadius: 12, padding: 14, alignItems: 'center' }}><Text style={{ color: '#4ade80', fontWeight: '700' }}>✓ Saved to library</Text></View>}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Modal visible={modal} animationType="slide" onRequestClose={() => setModal(false)}>
        <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', flex: 1 }}>{routine?.title}</Text>
              <TouchableOpacity onPress={() => setModal(false)} style={{ backgroundColor: '#2a2a3e', borderRadius: 18, width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 12 }}>🔥 Warm Up</Text>
              {routine?.warmup.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 }}>💪 Main Workout</Text>
              {routine?.exercises.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 }}>🧘 Cool Down</Text>
              {routine?.cooldown.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

function WorkoutsScreen() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState([]);
  const [selected, setSelected] = useState(null);
  useFocusEffect(useCallback(() => { if (user) getRoutines(user.id).then(setRoutines); }, [user]));
  const markComplete = async (r) => {
    if (!user) return;
    await saveSession(user.id, { id: Date.now().toString(), routineId: r.id, routineTitle: r.title, completedAt: new Date().toISOString(), durationMinutes: r.duration });
    setSelected(null);
    Alert.alert('Great work! 🎉', 'Session saved to your progress');
  };
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 }}>My Routines 📋</Text>
        <Text style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>{routines.length} saved routine{routines.length !== 1 ? 's' : ''}</Text>
        {routines.length === 0 ? (
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🏋️</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 }}>No routines yet</Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>Go to AI Coach and generate your first workout</Text>
          </View>
        ) : routines.map(r => (
          <TouchableOpacity key={r.id} onPress={() => setSelected(r)} activeOpacity={0.85}>
            <View style={{ backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: '#7c3aed22', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 22 }}>💪</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 }}>{r.title}</Text>
                <Text style={{ fontSize: 12, color: '#7c3aed', marginBottom: 2 }}>{r.exercises.length} exercises · {r.duration} min</Text>
                <Text style={{ fontSize: 12, color: '#666' }} numberOfLines={1}>{r.goal}</Text>
              </View>
              <Text style={{ color: '#444', fontSize: 24 }}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' }}>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Text style={{ color: '#7c3aed', fontSize: 16, fontWeight: '600' }}>‹ Back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => selected && markComplete(selected)} style={{ borderRadius: 10, overflow: 'hidden' }}>
                <LinearGradient colors={['#059669', '#047857']} style={{ paddingHorizontal: 16, paddingVertical: 10 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Mark Complete ✓</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            {selected && (
              <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 12 }}>{selected.title}</Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 12 }}>🔥 Warm Up</Text>
                {selected.warmup.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 }}>💪 Main Workout</Text>
                {selected.exercises.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
                <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 }}>🧘 Cool Down</Text>
                {selected.cooldown.map((ex, i) => <ExCard key={i} ex={ex} index={i} />)}
              </ScrollView>
            )}
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

function ProgressScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  useFocusEffect(useCallback(() => { if (user) getSessions(user.id).then(setSessions); }, [user]));
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const monthAgo = new Date(Date.now() - 30 * 86400000);
  const thisWeek = sessions.filter(s => new Date(s.completedAt) >= weekAgo);
  const total = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 40 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 }}>Progress 📈</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 }}>
          {[
            { num: thisWeek.length, label: 'This week' },
            { num: sessions.filter(s => new Date(s.completedAt) >= monthAgo).length, label: 'This month' },
            { num: sessions.length, label: 'All time' },
            { num: total, label: 'Total mins' },
          ].map(({ num, label }) => (
            <View key={label} style={{ flex: 1, minWidth: '45%', backgroundColor: '#1e1e2e', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' }}>
              <Text style={{ fontSize: 30, fontWeight: '800', color: '#7c3aed' }}>{num}</Text>
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{label}</Text>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 }}>Session History</Text>
        {sessions.length === 0 ? (
          <View style={{ backgroundColor: '#1e1e2e', borderRadius: 18, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>🎯</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 }}>No sessions yet</Text>
            <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>Complete a workout to start tracking</Text>
          </View>
        ) : sessions.map(s => (
          <View key={s.id} style={{ backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed', marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 }}>{s.routineTitle}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>{new Date(s.completedAt).toLocaleDateString()}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#7c3aed' }}>{s.durationMinutes}m</Text>
          </View>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#1e1e2e', borderTopColor: '#2a2a3e', paddingBottom: 8, paddingTop: 8, height: 72 }, tabBarActiveTintColor: '#7c3aed', tabBarInactiveTintColor: '#555', tabBarLabelStyle: { fontSize: 11, fontWeight: '600' } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="AICoach" component={AICoachScreen} options={{ title: 'AI Coach', tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} /> }} />
      <Tab.Screen name="Workouts" component={WorkoutsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="💪" focused={focused} /> }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📈" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function RootNav() {
  const { user, loading } = useAuth();
  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#0f0f1a', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 48 }}>⚡</Text>
      <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 12 }}>FitAI</Text>
    </View>
  );
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? <Stack.Screen name="Main" component={MainTabs} /> : <>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </>}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNav />
      </NavigationContainer>
    </AuthProvider>
  );
}
