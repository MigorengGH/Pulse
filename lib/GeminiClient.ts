import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';
import { useAuraStore } from '../store/useAuraStore';

const geminiKey = Constants.expoConfig?.extra?.geminiKey || '';
const genAI = new GoogleGenerativeAI(geminiKey);

const getContext = () => {
  const state = useAuraStore.getState();
  const sessionCount = state.signals.filter(s => s.type === 'session' && s.timestamp > new Date().setHours(0, 0, 0, 0)).length;
  const sessions = state.signals.filter(s => s.type === 'session' && s.timestamp > new Date().setHours(0, 0, 0, 0) && s.durationMs);
  const avgDurationMs = sessions.length ? sessions.reduce((acc, s) => acc + (s.durationMs || 0), 0) / sessions.length : 0;
  const avgDuration = Math.round(avgDurationMs / (1000 * 60));

  const triggers = state.lastAnalysis?.triggers || [];
  const isErraticSwipe = triggers.includes('Erratic/Anxious Swipe Pattern (Restlessness)');

  return `
- Stress score right now: ${Math.round(state.stressScore)}/100
- Pickups in last hour: ${state.pickupsLastHour}
- Last pickup was at: ${state.lastPickupTime ? new Date(state.lastPickupTime).toLocaleTimeString() : 'N/A'}
- Phone sessions today: ${sessionCount} sessions, avg ${avgDuration} minutes
- Insomnia signal: ${state.insomniaSignal}
- Power status: ${state.isCharging ? '⚡ Charging' : '🔋 On battery'}
- Movement: ${state.movementState}
- Scrolling/Swiping gesture patterns: ${isErraticSwipe ? '⚠️ Erratic/Frantic (Restlessness)' : 'Steady/Calm'}
- Top Bedtime Screentime Usage: TikTok (1h 45m - 50%), Instagram (1h 12m - 34%), Twitter/X (35m - 16%)
- Time of day right now: ${new Date().toLocaleTimeString()}
`;
};

export const getLocalFallbackResponse = (userMessage: string, customTriggers?: string[]): string => {
  const state = useAuraStore.getState();
  const score = state.stressScore;
  const lastAnalysis = state.lastAnalysis;
  const triggers = customTriggers && customTriggers.length > 0 ? customTriggers : (lastAnalysis?.triggers || []);

  const lowerMsg = userMessage.toLowerCase();

  // Special keywords overrides
  if (lowerMsg.includes('breath') || lowerMsg.includes('relax') || lowerMsg.includes('calm') || lowerMsg.includes('exercise')) {
    return "Let's take a quick moment together. Inhale slowly for 4 seconds, hold for 4, exhale for 4, and hold for 4. Repeat this Box Breathing sequence to calm your nervous system.";
  }

  if (triggers.includes('Erratic/Anxious Swipe Pattern (Restlessness)')) {
    return "I detected a rapid, frantic swipe pattern on your screen. Erratic scroll flicking is a biometric signature of micro-anxiety and nervous restlessness. Let's practice a conscious breathing pause together.";
  }

  if (triggers.includes('Playing phone constantly while charging late at night (High Stress)')) {
    return "I noticed you're active while charging late at night. Bedtime doomscrolling keeps your brain alert when it should be resting. Let's try putting the phone away and giving your mind some quiet rest.";
  }

  if (triggers.includes('Elevated checks rate (5+ pickups per min/hour) - Labeled as Stress') || triggers.includes('Rapid phone checking (restlessness)')) {
    return "I see you've been checking your phone very frequently. Constant checking is often a subconscious response to digital anxiety or restlessness. Let's try a 5-minute screen-free break.";
  }

  if (triggers.includes('Late night scrolling while still (in-bed scrolling)')) {
    return "You're still and scrolling late at night. Doomscrolling in bed is a common trigger for sleep disruption. Try placing your phone out of reach and taking a few slow, deep breaths.";
  }

  if (triggers.includes('Unusually long phone session (avoidance or flow)')) {
    return "You've been on your screen for a continuous stretch. To prevent eye strain and fatigue, try looking at something 20 feet away for 20 seconds to reset your focus.";
  }

  if (triggers.includes('Multiple ignored notifications (withdrawal/avoidance)')) {
    return "I noticed a build-up of unread notifications. Lock screen clutter can cause micro-anxiety. Consider muting non-essential notifications to lighten your cognitive load.";
  }

  if (score > 50) {
    return `Your passive stress score is a bit elevated right now (${Math.round(score)}/100). Take a slow, deep breath, and consider doing the Box Breathing exercise in the Settings tab to center yourself.`;
  }

  return "I'm here with you. If you're feeling a bit of digital clutter or restlessness right now, try closing your eyes and taking three slow, deep breaths.";
};

export const getAuraChatResponse = async (
  history: { role: 'user' | 'model', parts: { text: string }[] }[],
  message: string,
  forceRuleBased?: boolean
) => {
  // 🚨 Crisis Interceptor: Detects keywords related to self-harm or suicide
  const lowerMsg = message.toLowerCase();
  const crisisKeywords = [
    'suicide', 'self-harm', 'kill myself', 'hurt myself', 'end my life', 'want to die',
    'harm myself', 'cutting myself', 'ending my life', 'better off dead', 'don\'t want to live',
    'wanna die', 'suicidal'
  ];

  const isCrisis = crisisKeywords.some(keyword => lowerMsg.includes(keyword));
  if (isCrisis) {
    return "It sounds like you're going through a very difficult time right now. Please know that you are not alone, and there is support available. I want to encourage you to connect with someone who can help right now:\n\n" +
      "📞 Suicide & Crisis Lifeline: Call 0179787232 or text 988 (Available 24/7, free and confidential)\n\n" +
      "💬 Crisis Text Line: Text HOME to 741741\n\n" +
      "🚨 Emergency Services: Call 911 (or your local emergency number)\n\n" +
      "Please reach out to them. They have people ready to listen and support you.";
  }

  // If presentation controls or toggle forces Rule-Based mode
  if (forceRuleBased) {
    return getLocalFallbackResponse(message);
  }

  if (!geminiKey) {
    return getLocalFallbackResponse(message);
  }

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
    console.warn("Gemini Chat Error (Falling back to local advisor)", e);
    return getLocalFallbackResponse(message);
  }
};

export const getInsight = async (): Promise<string> => {
  const state = useAuraStore.getState();
  const score = state.stressScore;
  const triggers = state.lastAnalysis?.triggers || [];

  if (!geminiKey) {
    if (triggers.length > 0) {
      return `We noticed a few behavioral indicators today: ${triggers.join(', ')}. Consider taking a brief Box Breathing pause to reset.`;
    }
    return "Your digital rhythm looks healthy and calm today. Keep practicing balanced screen habits!";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  const prompt = `
Generate a warm, friendly, 2-sentence mindfulness observation for the user's dashboard today.

Their current state:
- Stress score: ${Math.round(score)}/100
- Active triggers detected: ${triggers.join(', ') || 'None (Healthy Baseline)'}
- Phone pickups today: ${state.pickupsToday}

Write a natural, empathetic observation. Do not use clinical terms, and do not mention specific scores or numbers. Offer one quick, actionable mindful tip.
Respond with only the insight, nothing else.
`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim().replace(/^"|"$/g, '');
  } catch (e) {
    return "Your digital rhythm looks healthy and calm today. Keep practicing balanced screen habits!";
  }
};

export const getNudgeContext = async () => {
  if (!geminiKey) {
    const state = useAuraStore.getState();
    if (state.pickupsLastHour > 0) {
      return `You've checked your phone ${state.pickupsLastHour} time${state.pickupsLastHour > 1 ? 's' : ''} in the last hour.`;
    }
    return "You've been quite active on your screen recently.";
  }

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
    const state = useAuraStore.getState();
    if (state.pickupsLastHour > 0) {
      return `You've checked your phone ${state.pickupsLastHour} time${state.pickupsLastHour > 1 ? 's' : ''} in the last hour.`;
    }
    return "You've been quite active on your screen recently.";
  }
};

export const generateNudge = async (triggers: string[], deviationScore: number): Promise<string> => {
  if (!geminiKey) {
    return getLocalFallbackResponse('', triggers);
  }

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
    return getLocalFallbackResponse('', triggers);
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

