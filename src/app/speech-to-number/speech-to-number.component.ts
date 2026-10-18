/**
 * @file speech-to-number.component.ts
 * @description Controller UI of the extension (opened from the toolbar icon). It listens to the
 * microphone, converts what the user says into a number and sends the matching command
 * (click / scroll) to the content script of the website the user is looking at.
 */
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { SpeechToTextService } from '../services/speech-to-text.service';
import { parseSpokenNumber } from './parse-number';
import { Subscription } from 'rxjs';

interface LanguageOption { name: string; code: string; }
type Feedback = { kind: 'ok' | 'info' | 'error'; text: string };

const LANGUAGE_STORAGE_KEY = 'numbernavigator.language';
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

  readonly isBrowserSupported = this.speech.isBrowserSupported();
  readonly isOnline = signal(navigator.onLine);
  readonly selectedLanguage = signal(this.initialLanguage());
  /** User intent: navigation started (numbers shown + microphone on). */
  readonly isActive = signal(false);
  readonly isListening = signal(false);
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
    if (!this.isBrowserSupported) {
      this.error.set('Speech recognition is not supported by this browser. Use Chrome or another Chromium-based browser.');
      return;
    }
    this.subs.add(this.speech.getSpeechObservable().subscribe((text) => this.onSpeech(text)));
    this.subs.add(this.speech.getErrorObservable().subscribe((message) => {
      this.error.set(message);
    }));
    this.subs.add(this.speech.getListeningStateObservable().subscribe((listening) => {
      this.isListening.set(listening);
      // A fatal error (e.g. microphone denied) stops listening for good: reflect it in the UI.
      if (!listening && this.isActive() && this.error()) this.stop(false);
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

  onLanguageChange(code: string): void {
    this.selectedLanguage.set(code);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, code); } catch { /* storage unavailable */ }
    this.lastHeard.set(null);
    this.feedback.set(null);
    this.speech.changeLanguage(code); // restarts by itself if listening
  }

  private start(): void {
    if (!this.isBrowserSupported || !this.isOnline()) return;
    this.error.set(null);
    this.feedback.set(null);
    this.lastHeard.set(null);
    this.isActive.set(true);
    this.speech.startListening(this.selectedLanguage());
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
    if (!this.isActive()) return;
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
    chrome.tabs.sendMessage(tab.id!, { action: 'numberClickables' }).catch(() => undefined);
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

  private initialLanguage(): string {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && this.languages.some((l) => l.code === saved)) return saved;
    } catch { /* ignore */ }
    const browser = (navigator.language || 'en').split('-')[0];
    return this.languages.some((l) => l.code === browser) ? browser : 'en';
  }
}
