import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  style?: ViewStyle;
  secondary?: boolean;
}

export default function GradientButton({ label, onPress, loading, style, secondary }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} style={[styles.wrapper, style]} activeOpacity={0.85}>
      <LinearGradient
        colors={secondary ? ['#2d2d3a', '#1e1e2a'] : ['#7c3aed', '#4f46e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 14, overflow: 'hidden' },
  gradient: { paddingVertical: 16, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
