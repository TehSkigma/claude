import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, WorkoutRoutine, WorkoutSession } from '../types';

const KEYS = {
  USERS: 'fitai_users',
  CURRENT_USER: 'fitai_current_user',
  ROUTINES: 'fitai_routines',
  SESSIONS: 'fitai_sessions',
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export async function registerUser(email: string, name: string, password: string): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEYS.USERS);
  const users: User[] = raw ? JSON.parse(raw) : [];
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) return null;
  const user: User = {
    id: Date.now().toString(),
    email,
    name,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await AsyncStorage.setItem(KEYS.USERS, JSON.stringify(users));
  return user;
}

export async function loginUser(email: string, password: string): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEYS.USERS);
  const users: User[] = raw ? JSON.parse(raw) : [];
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === simpleHash(password));
  return user || null;
}

export async function saveCurrentUser(user: User): Promise<void> {
  await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
}

export async function getCurrentUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(KEYS.CURRENT_USER);
  return raw ? JSON.parse(raw) : null;
}

export async function clearCurrentUser(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.CURRENT_USER);
}

export async function saveRoutine(userId: string, routine: WorkoutRoutine): Promise<void> {
  const key = `${KEYS.ROUTINES}_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  const routines: WorkoutRoutine[] = raw ? JSON.parse(raw) : [];
  routines.unshift(routine);
  await AsyncStorage.setItem(key, JSON.stringify(routines.slice(0, 20)));
}

export async function getRoutines(userId: string): Promise<WorkoutRoutine[]> {
  const key = `${KEYS.ROUTINES}_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

export async function saveSession(userId: string, session: WorkoutSession): Promise<void> {
  const key = `${KEYS.SESSIONS}_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  const sessions: WorkoutSession[] = raw ? JSON.parse(raw) : [];
  sessions.unshift(session);
  await AsyncStorage.setItem(key, JSON.stringify(sessions));
}

export async function getSessions(userId: string): Promise<WorkoutSession[]> {
  const key = `${KEYS.SESSIONS}_${userId}`;
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
