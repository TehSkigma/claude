import { WorkoutRoutine, Exercise } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export async function generateWorkoutRoutine(
  goal: string,
  equipment: string,
  apiKey: string
): Promise<WorkoutRoutine> {
  const prompt = `You are a professional personal trainer. Create a detailed 30-minute workout routine.

User's goal: ${goal}
Available equipment: ${equipment}

Respond with ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "title": "Workout title",
  "warmup": [
    {"name": "Exercise name", "sets": 1, "reps": "30 seconds", "rest": "10s", "muscle": "Full body", "instructions": "How to do it"}
  ],
  "exercises": [
    {"name": "Exercise name", "sets": 3, "reps": "10-12", "rest": "60s", "muscle": "Target muscle", "instructions": "How to do it"}
  ],
  "cooldown": [
    {"name": "Stretch name", "sets": 1, "reps": "30 seconds", "rest": "0s", "muscle": "Target muscle", "instructions": "How to do it"}
  ]
}

Include 2-3 warmup exercises, 5-7 main exercises, and 2-3 cooldown stretches. Fit everything in 30 minutes.`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || '';

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in AI response');

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    id: Date.now().toString(),
    title: parsed.title || 'Custom Workout',
    goal,
    equipment,
    duration: 30,
    warmup: parsed.warmup || [],
    exercises: parsed.exercises || [],
    cooldown: parsed.cooldown || [],
    createdAt: new Date().toISOString(),
  };
}
