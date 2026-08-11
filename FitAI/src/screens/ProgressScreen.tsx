import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getSessions } from '../utils/storage';
import { WorkoutSession } from '../types';

function groupByWeek(sessions: WorkoutSession[]): Record<string, WorkoutSession[]> {
  const grouped: Record<string, WorkoutSession[]> = {};
  sessions.forEach(s => {
    const d = new Date(s.completedAt);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - d.getDay());
    const key = startOfWeek.toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  return grouped;
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useFocusEffect(useCallback(() => {
    if (user) getSessions(user.id).then(setSessions);
  }, [user]));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const thisWeek = sessions.filter(s => new Date(s.completedAt) >= weekAgo);
  const thisMonth = sessions.filter(s => new Date(s.completedAt) >= monthAgo);
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const grouped = groupByWeek(sessions.slice(0, 20));
  const weekKeys = Object.keys(grouped);

  const streakDays = (() => {
    if (sessions.length === 0) return 0;
    const dates = sessions.map(s => new Date(s.completedAt).toDateString());
    let streak = 0;
    let d = new Date();
    while (dates.includes(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Progress 📈</Text>

        {/* Stat Grid */}
        <View style={styles.grid}>
          <LinearGradient colors={['#7c3aed', '#4f46e5']} style={[styles.statCard, styles.wide]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.statNum}>{streakDays}</Text>
            <Text style={styles.statLabel}>Day streak 🔥</Text>
          </LinearGradient>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#7c3aed' }]}>{thisWeek.length}</Text>
            <Text style={[styles.statLabel, { color: '#888' }]}>This week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#7c3aed' }]}>{thisMonth.length}</Text>
            <Text style={[styles.statLabel, { color: '#888' }]}>This month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#7c3aed' }]}>{sessions.length}</Text>
            <Text style={[styles.statLabel, { color: '#888' }]}>All time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: '#7c3aed' }]}>{totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: '#888' }]}>Total mins</Text>
          </View>
        </View>

        {/* Weekly bar chart */}
        {thisWeek.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This week</Text>
            <View style={styles.barContainer}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                const count = thisWeek.filter(s => new Date(s.completedAt).getDay() === i).length;
                return (
                  <View key={day} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <LinearGradient
                        colors={count > 0 ? ['#7c3aed', '#4f46e5'] : ['#2a2a3e', '#2a2a3e']}
                        style={[styles.barFill, { height: count > 0 ? 60 : 8 }]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{day}</Text>
                    {count > 0 && <Text style={styles.barCount}>{count}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Session history */}
        <Text style={styles.sectionTitle}>Session history</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎯</Text>
            <Text style={styles.emptyText}>No sessions yet</Text>
            <Text style={styles.emptyHint}>Complete a workout to start tracking your progress</Text>
          </View>
        ) : (
          weekKeys.map(weekKey => (
            <View key={weekKey}>
              <Text style={styles.weekLabel}>Week of {new Date(weekKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              {grouped[weekKey].map(s => (
                <View key={s.id} style={styles.sessionCard}>
                  <View style={styles.sessionDot} />
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{s.routineTitle}</Text>
                    <Text style={styles.sessionMeta}>
                      {new Date(s.completedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={styles.sessionDuration}>{s.durationMinutes}m</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#1e1e2e', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  wide: { minWidth: '100%' },
  statNum: { fontSize: 32, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 },
  barContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1e1e2e', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#2a2a3e' },
  barCol: { alignItems: 'center', flex: 1 },
  barTrack: { height: 70, justifyContent: 'flex-end', marginBottom: 8 },
  barFill: { width: 20, borderRadius: 6 },
  barLabel: { fontSize: 10, color: '#666' },
  barCount: { fontSize: 10, color: '#7c3aed', fontWeight: '700', marginTop: 2 },
  weekLabel: { fontSize: 12, color: '#666', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyCard: { backgroundColor: '#1e1e2e', borderRadius: 18, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  sessionCard: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  sessionDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#7c3aed', marginRight: 14 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 3 },
  sessionMeta: { fontSize: 12, color: '#666' },
  sessionDuration: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
});
