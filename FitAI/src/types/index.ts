export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  duration?: string;
  rest: string;
  muscle: string;
  instructions: string;
}

export interface WorkoutRoutine {
  id: string;
  title: string;
  goal: string;
  equipment: string;
  duration: number;
  exercises: Exercise[];
  warmup: Exercise[];
  cooldown: Exercise[];
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  routineTitle: string;
  completedAt: string;
  durationMinutes: number;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  AICoach: undefined;
  Workouts: undefined;
  Progress: undefined;
};
