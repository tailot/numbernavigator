/**
 * @file speech-to-number.component.ts
 * @description Controller UI of the extension (opened from the toolbar icon). It listens to
 * microphone speech and/or keyboard digits, converting them into actions and sending
 * commands (click / scroll) to the content script of the active tab.
 */
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActiveEngine, SpeechEngine, SpeechToTextService } from '../services/speech-to-text.service';
import { I18nService, LANGUAGE_STORAGE_KEY } from '../services/i18n.service';
import { MAX_SPOKEN_NUMBER, parseSpokenNumber } from './parse-number';
import { Subscription } from 'rxjs';

interface KeyTimeoutOption { ms: number; labelKey: string; }
interface FollowSizeOption { px: number; labelKey: string; }
interface TimedClickOption { sec: number; labelKey: string; }
type Feedback = { kind: 'ok' | 'info' | 'error'; text: string };

const ENGINE_STORAGE_KEY = 'numbernavigator.engine';
const VOICE_STORAGE_KEY = 'numbernavigator.voice';
const KEYBOARD_STORAGE_KEY = 'numbernavigator.keyboard';
const KEY_TIMEOUT_STORAGE_KEY = 'numbernavigator.keyTimeout';
const FOLLOW_STORAGE_KEY = 'numbernavigator.followCursor';
const FOLLOW_SIZE_STORAGE_KEY = 'numbernavigator.followSize';
const SCROLL_DOWN_STORAGE_KEY = 'numbernavigator.scrollDownNumber';
const SCROLL_UP_STORAGE_KEY = 'numbernavigator.scrollUpNumber';
const TOGGLE_NUMBER_STORAGE_KEY = 'numbernavigator.toggleNumber';
const TIMED_CLICK_STORAGE_KEY = 'numbernavigator.timedClick';
const TIMED_CLICK_INTERVAL_STORAGE_KEY = 'numbernavigator.timedClickInterval';

const DEFAULT_KEY_TIMEOUT_MS = 1000;
const DEFAULT_FOLLOW_SIZE_PX = 320;
const DEFAULT_TIMED_CLICK_INTERVAL_SEC = 2;
const DEFAULT_SCROLL_DOWN_NUMBER = 0;
const DEFAULT_SCROLL_UP_NUMBER = 1;
const DEFAULT_TOGGLE_NUMBER = 99;
const MIN_SPECIAL_NUMBER = 0;
const MAX_SPECIAL_NUMBER = MAX_SPOKEN_NUMBER;
const REFRESH_INTERVAL_MS = 3000;

export type SpecialOption = 'scrollDown' | 'scrollUp' | 'toggle';

@Component({
  selector: 'app-speech-to-number',
  templateUrl: './speech-to-number.component.html',
  styleUrls: ['./speech-to-number.component.sass'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeechToNumberComponent implements OnInit, OnDestroy {
  private readonly speech = inject(SpeechToTextService);
  readonly i18n = inject(I18nService);

  readonly languages = this.i18n.supportedLanguages;

  readonly keyTimeoutOptions: KeyTimeoutOption[] = [
    { ms: 600, labelKey: 'timeoutFast' },
    { ms: 1000, labelKey: 'timeoutDefault' },
    { ms: 1500, labelKey: 'timeout1_5' },
    { ms: 2000, labelKey: 'timeout2' },
    { ms: 3000, labelKey: 'timeoutSlow' },
  ];

  readonly followSizeOptions: FollowSizeOption[] = [
    { px: 200, labelKey: 'squareSmall' },
    { px: 320, labelKey: 'squareMedium' },
    { px: 480, labelKey: 'squareLarge' },
    { px: 640, labelKey: 'squareExtraLarge' },
  ];

  readonly timedClickOptions: TimedClickOption[] = [
    { sec: 1, labelKey: 'timedClick1s' },
    { sec: 2, labelKey: 'timedClick2s' },
    { sec: 3, labelKey: 'timedClick3s' },
    { sec: 5, labelKey: 'timedClick5s' },
    { sec: 10, labelKey: 'timedClick10s' },
  ];

  readonly isBrowserSupported = this.speech.isBrowserSupported();
  readonly voiceEnabled = signal(this.initialFlag(VOICE_STORAGE_KEY, true));
  readonly keyboardEnabled = signal(this.initialFlag(KEYBOARD_STORAGE_KEY, false));
  readonly keyTimeoutMs = signal(this.initialKeyTimeout());
  /** Follow-cursor mode: numbers only inside a square around the mouse pointer. */
  readonly followCursor = signal(this.initialFlag(FOLLOW_STORAGE_KEY, false));
  readonly followSizePx = signal(this.initialFollowSize());
  /** Timed click mode: automatically click links after hovering. */
  readonly timedClickEnabled = signal(this.initialFlag(TIMED_CLICK_STORAGE_KEY, false));
  readonly timedClickIntervalSec = signal(this.initialTimedClickInterval());
  /** Special function command numbers. Reserved: no element receives them. */
  readonly scrollDownNumber = signal(this.initialSpecialNumber(SCROLL_DOWN_STORAGE_KEY, DEFAULT_SCROLL_DOWN_NUMBER));
  readonly scrollUpNumber = signal(this.initialSpecialNumber(SCROLL_UP_STORAGE_KEY, DEFAULT_SCROLL_UP_NUMBER));
  readonly toggleNumber = signal(this.initialSpecialNumber(TOGGLE_NUMBER_STORAGE_KEY, DEFAULT_TOGGLE_NUMBER));
  readonly specialNumberError = signal<string | null>(null);
  /** Numbers hidden: the extension keeps listening but only the toggle number works. Reset on Start/Stop. */
  readonly numbersHidden = signal(false);

  readonly isOnline = signal(navigator.onLine);
  readonly selectedLanguage = signal(this.i18n.currentLanguage());
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
      this.error.set(this.i18n.t('speechNotSupported'));
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
    // The content script reports a show/hide toggle typed on the page
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(this.onRuntimeMessage);
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
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(this.onRuntimeMessage);
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

  getOtherReservedNumbers(option: SpecialOption): number[] {
    const res: number[] = [];
    if (option !== 'scrollDown') res.push(this.scrollDownNumber());
    if (option !== 'scrollUp') res.push(this.scrollUpNumber());
    if (option !== 'toggle') res.push(this.toggleNumber());
    return res;
  }

  getOptionValue(option: SpecialOption): number {
    if (option === 'scrollDown') return this.scrollDownNumber();
    if (option === 'scrollUp') return this.scrollUpNumber();
    return this.toggleNumber();
  }

  canStepOption(option: SpecialOption, delta: number): boolean {
    const current = this.getOptionValue(option);
    const otherReserved = this.getOtherReservedNumbers(option);
    let next = current + delta;
    while (next >= MIN_SPECIAL_NUMBER && next <= MAX_SPECIAL_NUMBER) {
      if (!otherReserved.includes(next)) return true;
      next += delta;
    }
    return false;
  }

  stepOption(option: SpecialOption, delta: number): void {
    const current = this.getOptionValue(option);
    const otherReserved = this.getOtherReservedNumbers(option);
    let next = current + delta;
    while (next >= MIN_SPECIAL_NUMBER && next <= MAX_SPECIAL_NUMBER) {
      if (!otherReserved.includes(next)) {
        this.setOptionValue(option, next);
        return;
      }
      next += delta;
    }
  }

  onSpecialNumberChange(option: SpecialOption, input: HTMLInputElement): void {
    const value = Number(input.value);
    const otherReserved = this.getOtherReservedNumbers(option);
    if (input.value.trim() === '' || !Number.isInteger(value) || value < MIN_SPECIAL_NUMBER || value > MAX_SPECIAL_NUMBER) {
      this.specialNumberError.set(this.i18n.t('optionNumberError', { min: MIN_SPECIAL_NUMBER, max: MAX_SPECIAL_NUMBER }));
      input.value = String(this.getOptionValue(option));
      return;
    }
    if (otherReserved.includes(value)) {
      this.specialNumberError.set(this.i18n.t('optionNumberDuplicateError'));
      input.value = String(this.getOptionValue(option));
      return;
    }
    this.specialNumberError.set(null);
    this.setOptionValue(option, value);
  }

  private setOptionValue(option: SpecialOption, value: number): void {
    this.specialNumberError.set(null);
    if (option === 'scrollDown') {
      this.scrollDownNumber.set(value);
      try { localStorage.setItem(SCROLL_DOWN_STORAGE_KEY, String(value)); } catch { /* ignore */ }
    } else if (option === 'scrollUp') {
      this.scrollUpNumber.set(value);
      try { localStorage.setItem(SCROLL_UP_STORAGE_KEY, String(value)); } catch { /* ignore */ }
    } else {
      this.toggleNumber.set(value);
      try { localStorage.setItem(TOGGLE_NUMBER_STORAGE_KEY, String(value)); } catch { /* ignore */ }
    }
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

  onTimedClickToggle(enabled: boolean): void {
    this.timedClickEnabled.set(enabled);
    this.saveFlag(TIMED_CLICK_STORAGE_KEY, enabled);
    void this.refreshActiveTab();
  }

  onTimedClickIntervalChange(value: string | number): void {
    const sec = Number(value);
    if (this.timedClickOptions.some((opt) => opt.sec === sec)) {
      this.timedClickIntervalSec.set(sec);
      try { localStorage.setItem(TIMED_CLICK_INTERVAL_STORAGE_KEY, String(sec)); } catch { /* ignore */ }
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
    this.i18n.setLanguage(code);
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
    this.numbersHidden.set(false); // every Start begins with the numbers visible
    this.notice.set(null);
    if (this.voiceUsable()) {
      void this.speech.startListening(this.selectedLanguage(), this.engine());
    }
    void this.refreshActiveTab();
    this.refreshTimer = window.setInterval(() => void this.refreshActiveTab(), REFRESH_INTERVAL_MS);
  }

  private stop(clearError = true): void {
    this.isActive.set(false);
    this.numbersHidden.set(false);
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
      this.feedback.set({ kind: 'info', text: this.i18n.t('notANumber') });
      return;
    }
    if (n === this.toggleNumber()) { this.toggleNumbersHidden(); return; }
    if (this.numbersHidden()) {
      // Hidden: numbers (and scrolling) are not available, only the toggle number is
      this.feedback.set({ kind: 'info', text: this.i18n.t('numbersHiddenNotice', { num: this.toggleNumber() }) });
      return;
    }
    void this.runCommand(n);
  }

  private toggleNumbersHidden(): void {
    const hidden = !this.numbersHidden();
    this.numbersHidden.set(hidden);
    this.feedback.set({
      kind: 'ok',
      text: hidden ? this.i18n.t('numbersHiddenSuccess', { num: this.toggleNumber() }) : this.i18n.t('numbersShownSuccess')
    });
    void this.refreshActiveTab();
  }

  private readonly onRuntimeMessage = (request: any): void => {
    if (request?.action !== 'numbersHiddenChanged' || !this.isActive()) return;
    const hidden = !!request.hidden;
    this.numbersHidden.set(hidden);
    this.feedback.set({
      kind: 'ok',
      text: hidden ? this.i18n.t('numbersHiddenSuccessKeyboard', { num: this.toggleNumber() }) : this.i18n.t('numbersShownSuccess')
    });
  };

  private async runCommand(n: number): Promise<void> {
    const message = n === this.scrollDownNumber() ? { action: 'scrollDown' }
                  : n === this.scrollUpNumber() ? { action: 'scrollUp' }
                  : { action: 'clickElement', number: n };
    const label = n === this.scrollDownNumber() ? this.i18n.t('scrolledDownSuccess')
                : n === this.scrollUpNumber() ? this.i18n.t('scrolledUpSuccess')
                : this.i18n.t('clickedSuccess', { num: n });
    const response = await this.sendToActiveTab(message);
    if (response?.status === 'Clicked' || response?.status === 'Scrolled down' || response?.status === 'Scrolled up') {
      this.feedback.set({ kind: 'ok', text: label });
    } else if (response?.sendMessageError || response?.error) {
      this.hasTargetTab.set(false);
      this.feedback.set({ kind: 'error', text: this.i18n.t('openWebsiteError') });
    } else {
      this.feedback.set({ kind: 'error', text: response?.message ?? this.i18n.t('pageNoResponseError') });
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
      followSize: this.followSizePx(),
      scrollDownNumber: this.scrollDownNumber(),
      scrollUpNumber: this.scrollUpNumber(),
      toggleNumber: this.toggleNumber(),
      numbersHidden: this.numbersHidden(),
      timedClick: this.timedClickEnabled(),
      timedClickInterval: this.timedClickIntervalSec()
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

  private initialSpecialNumber(key: string, defaultValue: number): number {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        const saved = Number(item);
        if (Number.isInteger(saved) && saved >= MIN_SPECIAL_NUMBER && saved <= MAX_SPECIAL_NUMBER) return saved;
      }
    } catch { /* ignore */ }
    return defaultValue;
  }

  private initialFollowSize(): number {
    try {
      const saved = Number(localStorage.getItem(FOLLOW_SIZE_STORAGE_KEY));
      if (this.followSizeOptions.some((opt) => opt.px === saved)) return saved;
    } catch { /* ignore */ }
    return DEFAULT_FOLLOW_SIZE_PX;
  }

  private initialTimedClickInterval(): number {
    try {
      const saved = Number(localStorage.getItem(TIMED_CLICK_INTERVAL_STORAGE_KEY));
      if (this.timedClickOptions.some((opt) => opt.sec === saved)) return saved;
    } catch { /* ignore */ }
    return DEFAULT_TIMED_CLICK_INTERVAL_SEC;
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

}
