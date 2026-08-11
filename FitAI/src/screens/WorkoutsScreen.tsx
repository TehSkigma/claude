import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getRoutines, saveSession } from '../utils/storage';
import { WorkoutRoutine, Exercise, WorkoutSession } from '../types';

export default function WorkoutsScreen() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<WorkoutRoutine[]>([]);
  const [selected, setSelected] = useState<WorkoutRoutine | null>(null);

  useFocusEffect(useCallback(() => {
    if (user) getRoutines(user.id).then(setRoutines);
  }, [user]));

  const markComplete = async (r: WorkoutRoutine) => {
    if (!user) return;
    const session: WorkoutSession = {
      id: Date.now().toString(),
      routineId: r.id,
      routineTitle: r.title,
      completedAt: new Date().toISOString(),
      durationMinutes: r.duration,
    };
    await saveSession(user.id, session);
    setSelected(null);
    Alert.alert('Great work! 🎉', 'Session saved to your progress');
  };

  const ExerciseCard = ({ ex, index }: { ex: Exercise; index: number }) => (
    <View style={styles.exCard}>
      <View style={styles.exRow}>
        <View style={styles.exNum}><Text style={styles.exNumText}>{index + 1}</Text></View>
        <View style={styles.exInfo}>
          <Text style={styles.exName}>{ex.name}</Text>
          <Text style={styles.exMuscle}>{ex.muscle}</Text>
        </View>
        <View>
          <Text style={styles.exSets}>{ex.sets}×{ex.reps}</Text>
          <Text style={styles.exRest}>rest {ex.rest}</Text>
        </View>
      </View>
      <Text style={styles.exInstructions}>{ex.instructions}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>My Routines 📋</Text>
        <Text style={styles.pageSub}>{routines.length} saved routine{routines.length !== 1 ? 's' : ''}</Text>

        {routines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🏋️</Text>
            <Text style={styles.emptyText}>No routines yet</Text>
            <Text style={styles.emptyHint}>Go to AI Coach and generate your first workout routine</Text>
          </View>
        ) : (
          routines.map(r => (
            <TouchableOpacity key={r.id} onPress={() => setSelected(r)} activeOpacity={0.85}>
              <View style={styles.routineCard}>
                <LinearGradient colors={['#7c3aed22', '#4f46e522']} style={styles.routineIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.routineIconText}>💪</Text>
                </LinearGradient>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineTitle}>{r.title}</Text>
                  <Text style={styles.routineMeta}>{r.exercises.length} exercises · {r.duration} min</Text>
                  <Text style={styles.routineGoal} numberOfLines={1}>{r.goal}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Routine Detail Modal */}
      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>‹ Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => selected && markComplete(selected)} style={styles.completeBtn}>
              <LinearGradient colors={['#059669', '#047857']} style={styles.completeBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.completeBtnText}>Mark Complete ✓</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {selected && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>{selected.title}</Text>
              <View style={styles.modalTags}>
                <View style={styles.tag}><Text style={styles.tagText}>{selected.duration} min</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{selected.exercises.length} exercises</Text></View>
              </View>
              <Text style={styles.modalGoal}>Goal: {selected.goal}</Text>
              <Text style={styles.modalEquip}>Equipment: {selected.equipment}</Text>

              <Text style={styles.phaseTitle}>🔥 Warm Up</Text>
              {selected.warmup.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}

              <Text style={styles.phaseTitle}>💪 Main Workout</Text>
              {selected.exercises.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}

              <Text style={styles.phaseTitle}>🧘 Cool Down</Text>
              {selected.cooldown.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}
            </ScrollView>
          )}
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  pageSub: { fontSize: 14, color: '#888', marginBottom: 24 },
  emptyCard: { backgroundColor: '#1e1e2e', borderRadius: 18, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  routineCard: { backgroundColor: '#1e1e2e', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a3e' },
  routineIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  routineIconText: { fontSize: 22 },
  routineInfo: { flex: 1 },
  routineTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  routineMeta: { fontSize: 12, color: '#7c3aed', marginBottom: 2 },
  routineGoal: { fontSize: 12, color: '#666' },
  arrow: { color: '#444', fontSize: 24, marginLeft: 8 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  backBtn: { padding: 4 },
  backBtnText: { color: '#7c3aed', fontSize: 16, fontWeight: '600' },
  completeBtn: { borderRadius: 10, overflow: 'hidden' },
  completeBtnGrad: { paddingHorizontal: 16, paddingVertical: 10 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalScroll: { padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12 },
  modalTags: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: '#7c3aed22', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#7c3aed44' },
  tagText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  modalGoal: { fontSize: 14, color: '#aaa', marginBottom: 4 },
  modalEquip: { fontSize: 14, color: '#aaa', marginBottom: 20 },
  phaseTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 },
  exCard: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  exRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  exMuscle: { fontSize: 12, color: '#888', marginTop: 2 },
  exSets: { fontSize: 14, fontWeight: '700', color: '#7c3aed', textAlign: 'right' },
  exRest: { fontSize: 11, color: '#666', textAlign: 'right', marginTop: 2 },
  exInstructions: { fontSize: 13, color: '#aaa', lineHeight: 18 },
});
