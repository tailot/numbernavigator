/**
 * @file speech-to-number.component.ts
 * @description Controller UI of the extension (opened from the toolbar icon). It listens to
 * microphone speech and/or keyboard digits, converting them into actions and sending
 * commands (click / scroll) to the content script of the active tab.
 */
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActiveEngine, SpeechEngine, SpeechToTextService } from '../services/speech-to-text.service';
import { parseSpokenNumber } from './parse-number';
import { Subscription } from 'rxjs';

interface LanguageOption { name: string; code: string; }
interface KeyTimeoutOption { ms: number; label: string; }
interface FollowSizeOption { px: number; label: string; }
type Feedback = { kind: 'ok' | 'info' | 'error'; text: string };

const LANGUAGE_STORAGE_KEY = 'numbernavigator.language';
const ENGINE_STORAGE_KEY = 'numbernavigator.engine';
const VOICE_STORAGE_KEY = 'numbernavigator.voice';
const KEYBOARD_STORAGE_KEY = 'numbernavigator.keyboard';
const KEY_TIMEOUT_STORAGE_KEY = 'numbernavigator.keyTimeout';
const FOLLOW_STORAGE_KEY = 'numbernavigator.followCursor';
const FOLLOW_SIZE_STORAGE_KEY = 'numbernavigator.followSize';

const DEFAULT_KEY_TIMEOUT_MS = 1000;
const DEFAULT_FOLLOW_SIZE_PX = 320;
const REFRESH_INTERVAL_MS = 3000;

@Component({
  selector: 'app-speech-to-number',
  templateUrl: './speech-to-number.component.html',
  styleUrls: ['./speech-to-number.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeechToNumberComponent implements OnInit, OnDestroy {
  private readonly speech = inject(SpeechToTextService);

  readonly languages: LanguageOption[] = [
    { name: '🇺🇸 English', code: 'en' },
    { name: '🇮🇹 Italiano', code: 'it' },
    { name: '🇪🇸 Español', code: 'es' },
    { name: '🇫🇷 Français', code: 'fr' },
    { name: '🇩🇪 Deutsch', code: 'de' },
    { name: '🇸🇦 العربية (Arabic)', code: 'ar' },
    { name: '🇯🇵 日本語 (Japanese)', code: 'ja' },
  ];

  readonly keyTimeoutOptions: KeyTimeoutOption[] = [
    { ms: 600, label: '0.6 s (fast)' },
    { ms: 1000, label: '1 s (default)' },
    { ms: 1500, label: '1.5 s' },
    { ms: 2000, label: '2 s' },
    { ms: 3000, label: '3 s (slow)' },
  ];

  readonly followSizeOptions: FollowSizeOption[] = [
    { px: 200, label: 'Small (200 px)' },
    { px: 320, label: 'Medium (320 px, default)' },
    { px: 480, label: 'Large (480 px)' },
    { px: 640, label: 'Extra large (640 px)' },
  ];

  readonly isBrowserSupported = this.speech.isBrowserSupported();
  readonly voiceEnabled = signal(this.initialFlag(VOICE_STORAGE_KEY, true));
  readonly keyboardEnabled = signal(this.initialFlag(KEYBOARD_STORAGE_KEY, false));
  readonly keyTimeoutMs = signal(this.initialKeyTimeout());
  /** Follow-cursor mode: numbers only inside a square around the mouse pointer. */
  readonly followCursor = signal(this.initialFlag(FOLLOW_STORAGE_KEY, false));
  readonly followSizePx = signal(this.initialFollowSize());

  readonly isOnline = signal(navigator.onLine);
  readonly selectedLanguage = signal(this.initialLanguage());
  /** User intent: navigation started (numbers shown). */
  readonly isActive = signal(false);
  readonly isListening = signal(false);
  readonly engine = signal<SpeechEngine>(this.initialEngine());
  readonly activeEngine = signal<ActiveEngine | null>(null);
  /** Progress while the on-device model downloads. */
  readonly modelStatus = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly localApiAvailable = this.speech.isLocalApiAvailable();
  readonly lastHeard = signal<string | null>(null);
  readonly feedback = signal<Feedback | null>(null);
  readonly error = signal<string | null>(null);
  /** True when the active tab is a normal website we can control. */
  readonly hasTargetTab = signal(true);

  private subs = new Subscription();
  private refreshTimer?: number;
  private numberedTabId?: number;

  // ------------------------------------------------------------------ lifecycle
  ngOnInit(): void {
    this.ensureAtLeastOneMethod();
    if (!this.isBrowserSupported && this.voiceEnabled()) {
      this.error.set('Speech recognition is not supported by this browser. Use Google Chrome or Microsoft Edge, or switch to keyboard navigation.');
    }
    this.subs.add(this.speech.getSpeechObservable().subscribe((text) => this.onSpeech(text)));
    this.subs.add(this.speech.getErrorObservable().subscribe((message) => {
      this.error.set(message);
    }));
    this.subs.add(this.speech.getStatusObservable().subscribe((s) => this.modelStatus.set(s)));
    this.subs.add(this.speech.getNoticeObservable().subscribe((n) => this.notice.set(n)));
    this.subs.add(this.speech.getActiveEngineObservable().subscribe((e) => this.activeEngine.set(e)));
    this.subs.add(this.speech.getListeningStateObservable().subscribe((listening) => {
      this.isListening.set(listening);
      // A fatal error (e.g. microphone denied) stops listening: reflect it in UI if keyboard is off.
      if (!listening && this.isActive() && this.voiceEnabled() && this.error() && !this.keyboardEnabled()) {
        this.stop(false);
      }
    }));

    // Follow the user while they move between tabs/pages: numbers must always match the visible page.
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.addListener(this.onTabEvent);
      chrome.tabs.onUpdated.addListener(this.onTabUpdated);
      chrome.windows?.onFocusChanged.addListener(this.onTabEvent);
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.clearInterval(this.refreshTimer);
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.onActivated.removeListener(this.onTabEvent);
      chrome.tabs.onUpdated.removeListener(this.onTabUpdated);
      chrome.windows?.onFocusChanged.removeListener(this.onTabEvent);
    }
    if (this.isListening()) this.speech.stopListening();
    if (this.isActive()) void this.clearNumbersEverywhere();
  }

  @HostListener('window:online') onOnline(): void { this.isOnline.set(true); }
  @HostListener('window:offline') onOffline(): void { this.isOnline.set(false); }

  // ------------------------------------------------------------------ user actions
  toggle(): void {
    if (this.isActive()) this.stop(); else this.start();
  }

  onVoiceToggle(enabled: boolean): void {
    if (!enabled && !this.keyboardEnabled()) return;
    this.voiceEnabled.set(enabled);
    this.saveFlag(VOICE_STORAGE_KEY, enabled);
    this.error.set(null);
    this.lastHeard.set(null);
    if (this.isActive()) {
      if (enabled) {
        if (this.voiceUsable()) void this.speech.startListening(this.selectedLanguage(), this.engine());
      } else {
        if (this.isListening()) this.speech.stopListening();
      }
    }
  }

  onKeyboardToggle(enabled: boolean): void {
    if (!enabled && !this.voiceEnabled()) return;
    this.keyboardEnabled.set(enabled);
    this.saveFlag(KEYBOARD_STORAGE_KEY, enabled);
    void this.refreshActiveTab();
  }

  onFollowCursorToggle(enabled: boolean): void {
    this.followCursor.set(enabled);
    this.saveFlag(FOLLOW_STORAGE_KEY, enabled);
    void this.refreshActiveTab();
  }

  onFollowSizeChange(value: string | number): void {
    const px = Number(value);
    if (this.followSizeOptions.some((opt) => opt.px === px)) {
      this.followSizePx.set(px);
      try { localStorage.setItem(FOLLOW_SIZE_STORAGE_KEY, String(px)); } catch { /* ignore */ }
      void this.refreshActiveTab();
    }
  }

  onKeyTimeoutChange(value: string | number): void {
    const ms = Number(value);
    if (this.keyTimeoutOptions.some((opt) => opt.ms === ms)) {
      this.keyTimeoutMs.set(ms);
      try { localStorage.setItem(KEY_TIMEOUT_STORAGE_KEY, String(ms)); } catch { /* ignore */ }
      void this.refreshActiveTab();
    }
  }

  onLanguageChange(code: string): void {
    this.selectedLanguage.set(code);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, code); } catch { /* storage unavailable */ }
    this.lastHeard.set(null);
    this.feedback.set(null);
    this.notice.set(null);
    void this.speech.restart(code, this.engine()); // restarts by itself if listening
  }

  onEngineChange(value: string): void {
    const engine = (['auto', 'cloud', 'local'].includes(value) ? value : 'auto') as SpeechEngine;
    this.engine.set(engine);
    try { localStorage.setItem(ENGINE_STORAGE_KEY, engine); } catch { /* storage unavailable */ }
    this.notice.set(null);
    this.error.set(null);
    void this.speech.restart(this.selectedLanguage(), engine);
  }

  canStart(): boolean {
    return this.voiceUsable() || this.keyboardEnabled();
  }

  voiceUsable(): boolean {
    return this.voiceEnabled() && this.isBrowserSupported && this.isOnline();
  }

  private start(): void {
    if (!this.canStart()) return;
    this.error.set(null);
    this.feedback.set(null);
    this.lastHeard.set(null);
    this.isActive.set(true);
    this.notice.set(null);
    if (this.voiceUsable()) {
      void this.speech.startListening(this.selectedLanguage(), this.engine());
    }
    void this.refreshActiveTab();
    this.refreshTimer = window.setInterval(() => void this.refreshActiveTab(), REFRESH_INTERVAL_MS);
  }

  private stop(clearError = true): void {
    this.isActive.set(false);
    window.clearInterval(this.refreshTimer);
    if (clearError) this.error.set(null);
    if (this.isListening()) this.speech.stopListening();
    void this.clearNumbersEverywhere();
  }

  // ------------------------------------------------------------------ speech handling
  private onSpeech(text: string): void {
    if (!this.isActive() || !this.voiceEnabled()) return;
    this.lastHeard.set(text);
    this.error.set(null);
    const n = parseSpokenNumber(text, this.selectedLanguage());
    if (n === null) {
      this.feedback.set({ kind: 'info', text: 'Not a number – say the number shown on the page.' });
      return;
    }
    void this.runCommand(n);
  }

  private async runCommand(n: number): Promise<void> {
    const message = n === 0 ? { action: 'scrollDown' } : n === 1 ? { action: 'scrollUp' } : { action: 'clickElement', number: n };
    const label = n === 0 ? 'Scrolled down' : n === 1 ? 'Scrolled up' : `Clicked ${n}`;
    const response = await this.sendToActiveTab(message);
    if (response?.status === 'Clicked' || response?.status === 'Scrolled down' || response?.status === 'Scrolled up') {
      this.feedback.set({ kind: 'ok', text: `✓ ${label}` });
    } else if (response?.sendMessageError || response?.error) {
      this.hasTargetTab.set(false);
      this.feedback.set({ kind: 'error', text: 'Open the website you want to control in another tab, then try again.' });
    } else {
      this.feedback.set({ kind: 'error', text: response?.message ?? 'The page did not respond. Try reloading it.' });
    }
  }

  // ------------------------------------------------------------------ tab handling
  private readonly onTabEvent = (): void => { void this.refreshActiveTab(); };
  private readonly onTabUpdated = (_id: number, change: chrome.tabs.TabChangeInfo): void => {
    if (change.status === 'complete') void this.refreshActiveTab();
  };

  /** Makes sure the tab the user is looking at is numbered, and the previous one is cleaned. */
  private async refreshActiveTab(): Promise<void> {
    if (!this.isActive() || typeof chrome === 'undefined' || !chrome.tabs) return;
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const isWebsite = !!tab?.id && !!tab.url && /^https?:\/\//.test(tab.url);
    this.hasTargetTab.set(isWebsite);
    if (!isWebsite) return;
    if (this.numberedTabId !== undefined && this.numberedTabId !== tab.id) {
      chrome.tabs.sendMessage(this.numberedTabId, { action: 'clearNumbers' }).catch(() => undefined);
    }
    this.numberedTabId = tab.id;
    chrome.tabs.sendMessage(tab.id!, {
      action: 'numberClickables',
      keyboard: this.keyboardEnabled(),
      keyTimeout: this.keyTimeoutMs(),
      followCursor: this.followCursor(),
      followSize: this.followSizePx()
    }).catch(() => undefined);
  }

  private async clearNumbersEverywhere(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    const ids = new Set<number>();
    if (this.numberedTabId !== undefined) ids.add(this.numberedTabId);
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id) ids.add(tab.id);
    ids.forEach((id) => chrome.tabs.sendMessage(id, { action: 'clearNumbers' }).catch(() => undefined));
    this.numberedTabId = undefined;
  }

  private async sendToActiveTab(message: object): Promise<any> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return { sendMessageError: 'Chrome tabs API not available' };
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.id || !tab.url || !/^https?:\/\//.test(tab.url)) return { error: 'Not a website' };
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (e: any) {
      return { sendMessageError: e?.message ?? String(e) };
    }
  }

  private initialFlag(key: string, defaultValue: boolean): boolean {
    try {
      const saved = localStorage.getItem(key);
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch { /* ignore */ }
    return defaultValue;
  }

  private saveFlag(key: string, value: boolean): void {
    try {
      localStorage.setItem(key, value ? '1' : '0');
    } catch { /* ignore */ }
  }

  private initialKeyTimeout(): number {
    try {
      const saved = Number(localStorage.getItem(KEY_TIMEOUT_STORAGE_KEY));
      if (this.keyTimeoutOptions.some((opt) => opt.ms === saved)) return saved;
    } catch { /* ignore */ }
    return DEFAULT_KEY_TIMEOUT_MS;
  }

  private initialFollowSize(): number {
    try {
      const saved = Number(localStorage.getItem(FOLLOW_SIZE_STORAGE_KEY));
      if (this.followSizeOptions.some((opt) => opt.px === saved)) return saved;
    } catch { /* ignore */ }
    return DEFAULT_FOLLOW_SIZE_PX;
  }

  private ensureAtLeastOneMethod(): void {
    if (!this.voiceEnabled() && !this.keyboardEnabled()) {
      this.voiceEnabled.set(true);
    }
  }

  private initialEngine(): SpeechEngine {
    try {
      const saved = localStorage.getItem(ENGINE_STORAGE_KEY);
      if (saved === 'auto' || saved === 'cloud' || saved === 'local') return saved;
    } catch { /* ignore */ }
    return 'auto';
  }

  private initialLanguage(): string {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && this.languages.some((l) => l.code === saved)) return saved;
    } catch { /* ignore */ }
    const browser = (navigator.language || 'en').split('-')[0];
    return this.languages.some((l) => l.code === browser) ? browser : 'en';
  }
}
