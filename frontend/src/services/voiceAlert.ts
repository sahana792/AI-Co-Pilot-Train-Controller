/**
 * voiceAlert.ts — Global Voice Alert System for RailControl AI v7
 * ─────────────────────────────────────────────────────────────────
 * Uses browser's Web Speech API (SpeechSynthesis) — zero dependencies.
 * Works offline, no API key needed.
 *
 * Features:
 *  🔊 Priority queue — CRITICAL always interrupts lower-priority speech
 *  🎚 Per-severity voice profiles (rate, pitch, volume)
 *  🔕 Mute/unmute toggle persisted in localStorage
 *  🔁 Cooldown per alert ID — won't re-announce same alert within 60s
 *  📢 Prefix announcements ("ATTENTION — Critical Alert — ...")
 *  🌐 Global singleton — importable from any component
 */

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface VoiceAlertOptions {
  severity?: AlertSeverity;
  id?: string;          // unique alert id — prevents duplicate announcements
  interrupt?: boolean;  // forcibly cancel current speech and speak immediately
  prefix?: boolean;     // add "Attention" prefix (default true for CRITICAL/HIGH)
}

// Voice profiles per severity
const VOICE_PROFILES: Record<AlertSeverity, { rate: number; pitch: number; volume: number }> = {
  CRITICAL: { rate: 0.88, pitch: 0.85, volume: 1.0 },  // slow, deep, loud
  HIGH:     { rate: 0.92, pitch: 0.95, volume: 0.95 },
  MEDIUM:   { rate: 1.0,  pitch: 1.0,  volume: 0.85 },
  LOW:      { rate: 1.05, pitch: 1.05, volume: 0.75 },
  INFO:     { rate: 1.1,  pitch: 1.1,  volume: 0.7  },
};

const SEVERITY_PRIORITY: Record<AlertSeverity, number> = {
  CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0,
};

const COOLDOWN_MS = 60_000; // 60 seconds — don't repeat same alert id
const MUTE_KEY    = 'railctrl_voice_muted';
const VOL_KEY     = 'railctrl_voice_volume';

class VoiceAlertService {
  private synth: SpeechSynthesis;
  private cooldownMap = new Map<string, number>(); // alertId → timestamp
  private queue: Array<{ text: string; opts: VoiceAlertOptions }> = [];
  private isSpeaking = false;
  private listeners = new Set<(muted: boolean) => void>();

  constructor() {
    this.synth = window.speechSynthesis;
    // Chrome bug — voices load async
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {}; // trigger voice load
    }
  }

  // ── Public state ────────────────────────────────────────────────────────────
  get isMuted(): boolean {
    return localStorage.getItem(MUTE_KEY) === 'true';
  }

  get volume(): number {
    const v = parseFloat(localStorage.getItem(VOL_KEY) || '1');
    return isNaN(v) ? 1 : Math.min(1, Math.max(0, v));
  }

  set volume(v: number) {
    localStorage.setItem(VOL_KEY, String(Math.min(1, Math.max(0, v))));
  }

  // ── Mute toggle ─────────────────────────────────────────────────────────────
  mute() {
    localStorage.setItem(MUTE_KEY, 'true');
    this.synth.cancel();
    this.queue = [];
    this.isSpeaking = false;
    this.listeners.forEach(fn => fn(true));
  }

  unmute() {
    localStorage.setItem(MUTE_KEY, 'false');
    this.listeners.forEach(fn => fn(false));
  }

  toggleMute() {
    if (this.isMuted) this.unmute(); else this.mute();
    return this.isMuted;
  }

  onMuteChange(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Core speak ──────────────────────────────────────────────────────────────
  speak(message: string, opts: VoiceAlertOptions = {}) {
    if (this.isMuted) return;
    if (!message?.trim()) return;

    const severity  = opts.severity || 'INFO';
    const priority  = SEVERITY_PRIORITY[severity];
    const alertId   = opts.id || '';

    // Cooldown check — skip if same alert was announced recently
    if (alertId) {
      const last = this.cooldownMap.get(alertId);
      if (last && Date.now() - last < COOLDOWN_MS) return;
      this.cooldownMap.set(alertId, Date.now());
    }

    // Build announcement text
    const usePrefix = opts.prefix !== false && (severity === 'CRITICAL' || severity === 'HIGH');
    const prefixText = severity === 'CRITICAL'
      ? 'Attention! Critical Alert! '
      : severity === 'HIGH'
      ? 'Warning. '
      : '';
    const fullText = usePrefix ? prefixText + message : message;

    // CRITICAL always interrupts
    if (severity === 'CRITICAL' || opts.interrupt) {
      this.synth.cancel();
      this.queue = this.queue.filter(q => (SEVERITY_PRIORITY[q.opts.severity || 'INFO']) >= priority);
      this.isSpeaking = false;
    }

    this.queue.push({ text: fullText, opts });
    this._processQueue();
  }

  // ── Convenience wrappers ────────────────────────────────────────────────────
  critical(message: string, id?: string) {
    this.speak(message, { severity: 'CRITICAL', id, interrupt: true });
  }

  high(message: string, id?: string) {
    this.speak(message, { severity: 'HIGH', id });
  }

  medium(message: string, id?: string) {
    this.speak(message, { severity: 'MEDIUM', id });
  }

  low(message: string, id?: string) {
    this.speak(message, { severity: 'LOW', id });
  }

  info(message: string, id?: string) {
    this.speak(message, { severity: 'INFO', id });
  }

  /** Announce an alert object directly (auto-picks severity) */
  announceAlert(alert: {
    id?: string; message?: string; type?: string;
    severity?: string; operator_action?: string;
  }) {
    if (!alert) return;
    const severity = (alert.severity?.toUpperCase() || 'LOW') as AlertSeverity;
    const text = [
      alert.type ? `${alert.type}.` : '',
      alert.message || '',
      alert.operator_action ? `Action required: ${alert.operator_action}` : '',
    ].filter(Boolean).join(' ');

    this.speak(text, { severity, id: alert.id });
  }

  /** Announce multiple new alerts — called when alerts list changes */
  announceNewAlerts(currentAlerts: any[], previousIds: Set<string>): Set<string> {
    const newIds = new Set<string>();
    currentAlerts.forEach(a => {
      newIds.add(a.id);
      if (!previousIds.has(a.id)) {
        this.announceAlert(a);
      }
    });
    return newIds;
  }

  // ── Queue processor ─────────────────────────────────────────────────────────
  private _processQueue() {
    if (this.isSpeaking || this.queue.length === 0 || this.isMuted) return;

    const item = this.queue.shift()!;
    const severity = item.opts.severity || 'INFO';
    const profile  = VOICE_PROFILES[severity];

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate   = profile.rate;
    utterance.pitch  = profile.pitch;
    utterance.volume = profile.volume * this.volume;
    utterance.lang   = 'en-IN'; // Indian English accent

    // Pick a suitable voice if available
    const voices = this.synth.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en-IN') ||
      v.lang.startsWith('en-GB') ||
      v.name.toLowerCase().includes('indian')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { this.isSpeaking = true; };
    utterance.onend   = () => { this.isSpeaking = false; this._processQueue(); };
    utterance.onerror = () => { this.isSpeaking = false; this._processQueue(); };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  /** Stop all speech immediately */
  stopAll() {
    this.synth.cancel();
    this.queue = [];
    this.isSpeaking = false;
  }

  /** Test voice — useful for the settings widget */
  test(severity: AlertSeverity = 'CRITICAL') {
    const samples: Record<AlertSeverity, string> = {
      CRITICAL: 'Attention! Critical Alert! Emergency brake activation detected on Train 2456 at Bengaluru Central.',
      HIGH:     'Warning. Signal fault detected near Yeshwanthpur Junction. Immediate inspection required.',
      MEDIUM:   'Medium alert. Train delay of 12 minutes reported on Mysuru Express.',
      LOW:      'Low priority. Platform 3 occupancy reaching 80 percent.',
      INFO:     'Information. System status nominal. All trains operating normally.',
    };
    this.synth.cancel();
    this.speak(samples[severity], { severity, interrupt: true });
  }
}

// ── Global singleton ────────────────────────────────────────────────────────
export const voiceAlert = new VoiceAlertService();
export default voiceAlert;
