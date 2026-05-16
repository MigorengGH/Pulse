import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { useAuraStore } from '../store/useAuraStore';

const geminiKey = Constants.expoConfig?.extra?.geminiKey || '';
const genAI = new GoogleGenerativeAI(geminiKey);

const getContext = () => {
  const state = useAuraStore.getState();
  const sessionCount = state.signals.filter(s => s.type === 'session' && s.timestamp > new Date().setHours(0,0,0,0)).length;
  const sessions = state.signals.filter(s => s.type === 'session' && s.timestamp > new Date().setHours(0,0,0,0) && s.durationMs);
  const avgDurationMs = sessions.length ? sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / sessions.length : 0;
  const avgDuration = Math.round(avgDurationMs / (1000 * 60));
  
  return `
- Stress score right now: ${Math.round(state.stressScore)}/100
- Pickups in last hour: ${state.pickupsLastHour}
- Last pickup was at: ${state.lastPickupTime ? new Date(state.lastPickupTime).toLocaleTimeString() : 'N/A'}
- Phone sessions today: ${sessionCount} sessions, avg ${avgDuration} minutes
- Insomnia signal: ${state.insomniaSignal}
- Movement: ${state.movementState}
- Time of day: ${new Date().toLocaleTimeString()}
`;
};

export const getAuraChatResponse = async (history: { role: 'user' | 'model', parts: {text: string}[] }[], message: string) => {
  if (!geminiKey) return "API key missing.";

  const systemPrompt = `
You are Pulse, a calm and empathetic AI wellness companion.
You have access to the user's passive phone behaviour data:
${getContext()}

NEVER say "I can see from your data that...". Instead speak naturally,
referencing what you know only when relevant.
Never be preachy. Be warm, curious, human.
Offer to help them in the moment. Short responses under 3 sentences unless 
they ask for more.
`;
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-lite",
    systemInstruction: systemPrompt
  });

  try {
    const chat = model.startChat({
      history: history
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Chat Error", e);
    return "I'm having a little trouble connecting right now, but I'm still here with you.";
  }
};

export const getInsight = async () => {
  if (!geminiKey) return "Take a deep breath. You're doing okay.";

  const state = useAuraStore.getState();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `
Generate a single sentence of compassionate behavioural insight based on these recent signals:
- Pickups today: ${state.pickupsToday}
- Stress Score: ${state.stressScore}/100
- Insomnia Signal: ${state.insomniaSignal}
Be warm, non-judgmental, and insightful. Just one short sentence.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch (e) {
    return "Your rhythm is your own. Take it one step at a time.";
  }
};

export const getNudgeContext = async () => {
  if (!geminiKey) return "You've been quite active on your phone.";

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `
Generate a single 1-sentence context line about the user's current phone behaviour to show in a gentle "Time to breathe?" popup.
Signals:
${getContext()}
Make it factual but gentle. E.g., "You've picked up your phone 12 times in the last hour."
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch (e) {
    return "Your phone has been keeping you busy.";
  }
};

export const generateNudge = async (triggers: string[], deviationScore: number): Promise<string> => {
  if (!geminiKey) return "Hey, noticed some restlessness. Maybe a quick pause?";

  const state = useAuraStore.getState();
  const hour = new Date().getHours();
  const timeBucket = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `
You are a caring, non-clinical mental wellness companion.
A user's phone behavior suggests they might be stressed or overwhelmed right now.

Their current signals: ${triggers.join(', ')}
Time of day: ${timeBucket}
Deviation from their normal: ${deviationScore}% above baseline

Write ONE short, warm nudge message (max 2 sentences).
Do NOT use clinical language. Do NOT mention scores or data.
Make it feel like a kind friend noticed, not an algorithm.
Sound natural, not corporate.

Examples of good tone:
- "Looks like it's been a busy evening on the phone. Maybe a 5-minute break could help reset?"
- "You've been jumping between apps a lot lately. Want to try one slow breath before continuing?"

Respond with only the nudge message, nothing else.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch (e) {
    return "Hey, noticed some restlessness. Maybe a quick pause?";
  }
};

export const generateWeeklyInsight = async (): Promise<string> => {
  if (!geminiKey) return "This week has been a journey. Take a moment to reflect on how you've been feeling.";

  const state = useAuraStore.getState();
  const signals = state.signals;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekSignals = signals.filter(s => s.timestamp >= weekAgo);

  const totalPickups = weekSignals.filter(s => s.type === 'pickup').length;
  const sessions = weekSignals.filter(s => s.type === 'session' && s.durationMs);
  const totalScreenTimeMin = Math.round(sessions.reduce((a, s) => a + (s.durationMs || 0), 0) / 60000);
  const avgDailyPickups = Math.round(totalPickups / 7);
  const insomniaCount = weekSignals.filter(s => s.type === 'insomnia').length;

  // Find most active day
  const dailyCounts: Record<string, number> = {};
  weekSignals.forEach(s => {
    const day = new Date(s.timestamp).toLocaleDateString('en-US', { weekday: 'long' });
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const mostActiveDay = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `
Generate a 3-sentence personalized weekly reflection about someone's phone usage.

Their week:
- Total pickups: ${totalPickups} (avg ${avgDailyPickups}/day)
- Total screen time: ${totalScreenTimeMin} minutes
- Late night episodes: ${insomniaCount}
- Most active day: ${mostActiveDay}
- Current stress score: ${Math.round(state.stressScore)}/100

Be warm, insightful, non-judgmental. Notice patterns gently.
Mention one specific observation and offer one gentle suggestion.
Do not mention numbers directly — speak in natural language.
Respond with only the reflection, nothing else.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch (e) {
    return "This week has been a journey. Take a moment to reflect on how you've been feeling.";
  }
};

