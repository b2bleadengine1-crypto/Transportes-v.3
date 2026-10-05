// Proximity Alarm Service for Destination Stops
// Notifies user with device Notification, Haptic Vibration, and Audio Chime when within 500 meters

export interface DestinationStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/**
 * Requests Notification permission on user gesture.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    return 'denied';
  }
}

/**
 * Plays a pleasant three-tone transit chime (D5 -> A5 -> C6) using Web Audio API
 */
export function playProximityChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const notes = [
      { freq: 587.33, start: 0, dur: 0.25 }, // D5
      { freq: 880.0, start: 0.2, dur: 0.35 }, // A5
      { freq: 1046.5, start: 0.45, dur: 0.6 }, // C6
    ];

    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.4, now + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + dur);
    });
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

/**
 * Triggers hardware haptic vibration if supported (e.g. mobile Android / iOS WebApp)
 */
export function triggerProximityVibration() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([350, 150, 350, 150, 600]);
    }
  } catch (err) {
    // Vibration ignored if disabled
  }
}

/**
 * Sends a local device notification
 */
export async function sendProximityNotification(stopName: string, distanceMeters: number) {
  const title = `⚠️ Estás a chegar ao teu destino!`;
  const body = `Estás a ~${Math.round(distanceMeters)}m da paragem "${stopName}". Prepara-te para sair!`;

  // 1. Play transit chime and haptic feedback
  playProximityChime();
  triggerProximityVibration();

  // 2. Try Service Worker Notification first (best for mobile PWA and background tabs)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'stop-proximity-alert',
          renotify: true,
          vibrate: [350, 150, 350, 150, 600],
          data: { url: window.location.href },
        } as any);
        return;
      }
    } catch (e) {
      // Fallback to standard window Notification
    }
  }

  // 3. Fallback standard Web Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'stop-proximity-alert',
      });
    } catch (e) {
      console.warn('Could not trigger Notification constructor:', e);
    }
  }
}
