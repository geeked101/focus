import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STOP_ACTION_ID = 'STOP_ALARMS';
const STORAGE_KEY = 'focusAlarmState_v3';

// ─── Foreground handler ───────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Register Stop button on notifications ────────────────────────────────────
export async function setupNotificationActions() {
  await Notifications.setNotificationCategoryAsync('focus-alarm', [
    {
      identifier: STOP_ACTION_ID,
      buttonTitle: '⛔ Stop Alarms',
      options: {
        isDestructive: true,
        isAuthenticationRequired: false,
        opensAppToForeground: false,
      },
    },
  ]);
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return status === 'granted';
}

// ─── Schedule all alarms ──────────────────────────────────────────────────────
export async function scheduleAlarms({ intervalMinutes, stopTime, mode, customSoundUri }) {
  // Always start fresh
  await Notifications.cancelAllScheduledNotificationsAsync();
  await setupNotificationActions();

  const granted = await requestPermissions();
  if (!granted) {
    throw new Error('Please allow notifications in your phone settings.');
  }

  const now = new Date();
  const alarmIds = [];
  const alarmTimes = [];

  // Compute stop cutoff
  let stopAt = null;
  if (stopTime) {
    stopAt = new Date();
    stopAt.setHours(stopTime.hours, stopTime.minutes, 0, 0);
    // If stop time already passed today, push to tomorrow
    if (stopAt <= now) stopAt.setDate(stopAt.getDate() + 1);
  }

  const MAX = 64; // Android/iOS notification scheduling limit
  let count = 0;
  let next = new Date(now.getTime() + intervalMinutes * 60 * 1000);

  while (count < MAX) {
    if (stopAt && next >= stopAt) break;

    const useSound = mode !== 'vibrate';
    const useVibrate = mode !== 'sound';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Focus Check',
        body: 'Hey — are you on task? Take a breath and refocus.',
        sound: useSound,
        // Android vibration: [wait, vibrate, wait, vibrate] in ms
        vibrate: useVibrate ? [0, 500, 200, 500] : [0],
        priority: 'max',
        categoryIdentifier: 'focus-alarm',
        data: {
          type: 'focus-alarm',
          scheduledFor: next.toISOString(),
        },
      },
      trigger: {
        type: 'date',
        date: next,
      },
    });

    alarmIds.push(id);
    alarmTimes.push(next.toISOString());
    next = new Date(next.getTime() + intervalMinutes * 60 * 1000);
    count++;
  }

  const state = {
    running: true,
    intervalMinutes,
    stopTime: stopTime || null,
    mode,
    customSoundUri: customSoundUri || null,
    alarmIds,
    alarmTimes,
    scheduledCount: count,
    startedAt: now.toISOString(),
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

// ─── Cancel all alarms ────────────────────────────────────────────────────────
export async function cancelAllAlarms() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// ─── Load persisted state ─────────────────────────────────────────────────────
export async function loadAlarmState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Get the next future alarm timestamp ─────────────────────────────────────
export function getNextAlarmTime(alarmTimes = []) {
  const now = Date.now();
  const future = alarmTimes
    .map((t) => new Date(t).getTime())
    .filter((t) => t > now)
    .sort((a, b) => a - b);
  return future.length > 0 ? future[0] : null;
}

// ─── Haptic feedback ──────────────────────────────────────────────────────────
export async function triggerHaptic(mode) {
  if (mode === 'sound') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await new Promise((r) => setTimeout(r, 300));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (_) {}
}
