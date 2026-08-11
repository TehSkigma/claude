import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { generateWorkoutRoutine } from '../utils/ai';
import { saveRoutine } from '../utils/storage';
import { WorkoutRoutine, Exercise } from '../types';
import GradientButton from '../components/GradientButton';

const EQUIPMENT_OPTIONS = [
  'No equipment (bodyweight)',
  'Dumbbells',
  'Barbell + plates',
  'Resistance bands',
  'Pull-up bar',
  'Kettlebell',
  'Full gym',
];

const GOAL_SUGGESTIONS = [
  'Build muscle and strength',
  'Lose weight and burn fat',
  'Improve cardio endurance',
  'Increase flexibility',
  'Full body toning',
];

export default function AICoachScreen() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [goal, setGoal] = useState('');
  const [equipment, setEquipment] = useState('');
  const [loading, setLoading] = useState(false);
  const [routine, setRoutine] = useState<WorkoutRoutine | null>(null);
  const [saved, setSaved] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async () => {
    if (!apiKey.trim()) { Alert.alert('API Key Required', 'Please enter your Anthropic API key'); return; }
    if (!goal.trim()) { Alert.alert('Missing Info', 'Please describe your goal'); return; }
    if (!equipment.trim()) { Alert.alert('Missing Info', 'Please describe your available equipment'); return; }

    setLoading(true);
    setSaved(false);
    try {
      const r = await generateWorkoutRoutine(goal.trim(), equipment.trim(), apiKey.trim());
      setRoutine(r);
    } catch (e: any) {
      Alert.alert('Generation Failed', e.message || 'Could not generate routine. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!routine || !user) return;
    await saveRoutine(user.id, routine);
    setSaved(true);
    Alert.alert('Saved!', 'Routine saved to your library');
  };

  const ExerciseCard = ({ ex, index }: { ex: Exercise; index: number }) => (
    <View style={styles.exCard}>
      <View style={styles.exHeader}>
        <View style={styles.exNum}><Text style={styles.exNumText}>{index + 1}</Text></View>
        <View style={styles.exInfo}>
          <Text style={styles.exName}>{ex.name}</Text>
          <Text style={styles.exMuscle}>{ex.muscle}</Text>
        </View>
        <View style={styles.exMeta}>
          <Text style={styles.exSets}>{ex.sets}×{ex.reps}</Text>
          <Text style={styles.exRest}>rest {ex.rest}</Text>
        </View>
      </View>
      <Text style={styles.exInstructions}>{ex.instructions}</Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.pageTitle}>AI Coach 🤖</Text>
          <Text style={styles.pageSub}>Describe your goal and available equipment — get a custom 30-minute routine</Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Anthropic API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="sk-ant-..."
              placeholderTextColor="#555"
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.hint}>Your key is used only on-device and never stored on a server.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>What's your goal?</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. Build upper body strength and lose some fat..."
              placeholderTextColor="#555"
              value={goal}
              onChangeText={setGoal}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.chipLabel}>Quick picks:</Text>
            <View style={styles.chips}>
              {GOAL_SUGGESTIONS.map(g => (
                <TouchableOpacity key={g} onPress={() => setGoal(g)} style={[styles.chip, goal === g && styles.chipActive]}>
                  <Text style={[styles.chipText, goal === g && styles.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Available equipment</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dumbbells, resistance bands..."
              placeholderTextColor="#555"
              value={equipment}
              onChangeText={setEquipment}
            />
            <Text style={styles.chipLabel}>Quick picks:</Text>
            <View style={styles.chips}>
              {EQUIPMENT_OPTIONS.map(e => (
                <TouchableOpacity key={e} onPress={() => setEquipment(e)} style={[styles.chip, equipment === e && styles.chipActive]}>
                  <Text style={[styles.chipText, equipment === e && styles.chipTextActive]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <GradientButton label="Generate My Routine ✨" onPress={handleGenerate} loading={loading} style={styles.generateBtn} />

          {routine && (
            <View style={styles.routineResult}>
              <LinearGradient colors={['#7c3aed', '#4f46e5']} style={styles.routineHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.routineTitle}>{routine.title}</Text>
                <Text style={styles.routineSubtitle}>{routine.duration} min · {routine.exercises.length} exercises</Text>
              </LinearGradient>

              <TouchableOpacity onPress={() => setShowModal(true)} style={styles.viewFullBtn}>
                <Text style={styles.viewFullText}>View Full Routine →</Text>
              </TouchableOpacity>

              <Text style={styles.previewSection}>Main exercises:</Text>
              {routine.exercises.slice(0, 3).map((ex, i) => (
                <View key={i} style={styles.previewRow}>
                  <Text style={styles.previewDot}>•</Text>
                  <Text style={styles.previewText}>{ex.name} — {ex.sets}×{ex.reps}</Text>
                </View>
              ))}
              {routine.exercises.length > 3 && (
                <Text style={styles.moreText}>+{routine.exercises.length - 3} more exercises</Text>
              )}

              {!saved ? (
                <GradientButton label="Save to Library" onPress={handleSave} style={styles.saveBtn} />
              ) : (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedText}>✓ Saved to your library</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full Routine Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <LinearGradient colors={['#0f0f1a', '#1a1a2e']} style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{routine?.title}</Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.phaseTitle}>🔥 Warm Up</Text>
            {routine?.warmup.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}
            <Text style={styles.phaseTitle}>💪 Main Workout</Text>
            {routine?.exercises.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}
            <Text style={styles.phaseTitle}>🧘 Cool Down</Text>
            {routine?.cooldown.map((ex, i) => <ExerciseCard key={i} ex={ex} index={i} />)}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  pageSub: { fontSize: 14, color: '#888', marginBottom: 24, lineHeight: 20 },
  card: { backgroundColor: '#1e1e2e', borderRadius: 18, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#aaa', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#13131f', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e' },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: '#555', marginTop: 8 },
  chipLabel: { fontSize: 12, color: '#666', marginTop: 14, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#13131f', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2a3e' },
  chipActive: { backgroundColor: '#7c3aed22', borderColor: '#7c3aed' },
  chipText: { color: '#888', fontSize: 12 },
  chipTextActive: { color: '#7c3aed', fontWeight: '600' },
  generateBtn: { marginBottom: 24 },
  routineResult: { backgroundColor: '#1e1e2e', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a3e' },
  routineHeader: { padding: 20 },
  routineTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 4 },
  routineSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  viewFullBtn: { margin: 16, padding: 14, backgroundColor: '#13131f', borderRadius: 12, borderWidth: 1, borderColor: '#2a2a3e', alignItems: 'center' },
  viewFullText: { color: '#7c3aed', fontWeight: '700', fontSize: 14 },
  previewSection: { fontSize: 13, fontWeight: '700', color: '#aaa', marginHorizontal: 16, marginBottom: 8 },
  previewRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 6 },
  previewDot: { color: '#7c3aed', marginRight: 8, fontSize: 14 },
  previewText: { color: '#ccc', fontSize: 14, flex: 1 },
  moreText: { color: '#666', fontSize: 13, marginHorizontal: 16, marginBottom: 4 },
  saveBtn: { margin: 16 },
  savedBadge: { margin: 16, backgroundColor: '#0d2b17', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#1a4a2e' },
  savedText: { color: '#4ade80', fontWeight: '700', fontSize: 14 },
  modal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1, marginRight: 12 },
  closeBtn: { backgroundColor: '#2a2a3e', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16 },
  modalScroll: { padding: 20, paddingBottom: 40 },
  phaseTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8, marginBottom: 12 },
  exCard: { backgroundColor: '#1e1e2e', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e' },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exNumText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  exMuscle: { fontSize: 12, color: '#888', marginTop: 2 },
  exMeta: { alignItems: 'flex-end' },
  exSets: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  exRest: { fontSize: 11, color: '#666', marginTop: 2 },
  exInstructions: { fontSize: 13, color: '#aaa', lineHeight: 18 },
});
