import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getRoutines, getSessions } from '../utils/storage';
import { WorkoutRoutine, WorkoutSession } from '../types';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [r, s] = await Promise.all([getRoutines(user.id), getSessions(user.id)]);
    setRoutines(r);
    setSessions(s);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const thisWeekCount = sessions.filter(s => {
    const d = new Date(s.completedAt);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d >= weekAgo;
  }).length;

  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0]} 💪</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <LinearGradient colors={['#7c3aed', '#4f46e5']} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.statNum}>{thisWeekCount}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </LinearGradient>
          <View style={styles.statCard2}>
            <Text style={styles.statNum2}>{sessions.length}</Text>
            <Text style={styles.statLabel2}>Total sessions</Text>
          </View>
          <View style={styles.statCard2}>
            <Text style={styles.statNum2}>{routines.length}</Text>
            <Text style={styles.statLabel2}>Routines</Text>
          </View>
        </View>

        {/* Banner */}
        <LinearGradient colors={['#1e1e2e', '#16213e']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View>
            <Text style={styles.bannerTitle}>Ready to train?</Text>
            <Text style={styles.bannerSub}>Tap AI Coach to generate your routine</Text>
          </View>
          <Text style={styles.bannerEmoji}>🤖</Text>
        </LinearGradient>

        {/* Recent Routines */}
        <Text style={styles.sectionTitle}>Recent Routines</Text>
        {routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No routines yet</Text>
            <Text style={styles.emptyHint}>Use the AI Coach tab to generate your first workout</Text>
          </View>
        ) : (
          routines.slice(0, 5).map(r => (
            <View key={r.id} style={styles.routineCard}>
              <View style={styles.routineLeft}>
                <Text style={styles.routineTitle}>{r.title}</Text>
                <Text style={styles.routineMeta}>{r.exercises.length} exercises · {r.duration} min</Text>
                <Text style={styles.routineGoal} numberOfLines={1}>{r.goal}</Text>
              </View>
              <View style={styles.routineBadge}>
                <Text style={styles.routineBadgeText}>{r.duration}m</Text>
              </View>
            </View>
          ))
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            {sessions.slice(0, 3).map(s => (
              <View key={s.id} style={styles.sessionCard}>
                <Text style={styles.sessionTitle}>{s.routineTitle}</Text>
                <Text style={styles.sessionMeta}>
                  {new Date(s.completedAt).toLocaleDateString()} · {s.durationMinutes} min
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  greeting: { fontSize: 16, color: '#888' },
  name: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 2 },
  logoutBtn: { backgroundColor: '#1e1e2e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a3e' },
  logoutText: { color: '#888', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1.2, borderRadius: 16, padding: 16, alignItems: 'center' },
  statCard2: { flex: 1, backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  statNum2: { fontSize: 28, fontWeight: '800', color: '#7c3aed' },
  statLabel2: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  banner: { borderRadius: 18, padding: 20, marginBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  bannerSub: { fontSize: 13, color: '#888' },
  bannerEmoji: { fontSize: 36 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 },
  emptyCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#2a2a3e' },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#666', textAlign: 'center' },
  routineCard: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#2a2a3e' },
  routineLeft: { flex: 1, marginRight: 12 },
  routineTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  routineMeta: { fontSize: 12, color: '#666', marginBottom: 2 },
  routineGoal: { fontSize: 12, color: '#888' },
  routineBadge: { backgroundColor: '#7c3aed22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  routineBadgeText: { color: '#7c3aed', fontWeight: '700', fontSize: 13 },
  sessionCard: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e' },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  sessionMeta: { fontSize: 12, color: '#666' },
});
