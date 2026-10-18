/**
 * @file speech-to-text.service.ts
 * @description Wrapper around the browser SpeechRecognition API with two engines:
 *  - "cloud": the browser's online service (default on Chrome);
 *  - "local": the on-device model (Edge 150+, `processLocally`), no network needed after the
 *    one-time model download. Currently supported local languages: en, it, es, de.
 * In "auto" mode Edge prefers the local engine and any browser falls back to it when the online
 * service reports a network error.
 */
import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export type SpeechEngine = 'auto' | 'cloud' | 'local';
export type ActiveEngine = 'cloud' | 'local';

/** Language codes of the app -> BCP-47 tags accepted by the on-device model. */
const LOCAL_LANGS: Record<string, string> = { en: 'en-US', it: 'it-IT', es: 'es-ES', de: 'de-DE' };

@Injectable({ providedIn: 'root' })
export class SpeechToTextService {
  private ctor: any;
  private recognition: any;

  private isListening = false;
  /** User intent: keep listening (restart automatically when the browser ends a session). */
  private wantListening = false;
  private starting = false;
  private useLocal = false;
  private fallbackTried = false;
  private lastErrorWasNetwork = false;
  private language = 'en';
  private engineSetting: SpeechEngine = 'auto';

  private speechSubject = new Subject<string>();
  private errorSubject = new Subject<string>();
  private noticeSubject = new Subject<string>();
  private statusSubject = new Subject<string | null>();
  private listeningStateSubject = new Subject<boolean>();
  private activeEngineSubject = new Subject<ActiveEngine>();

  constructor(private ngZone: NgZone) {
    const w = window as any;
    this.ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!this.ctor) {
      console.error('Speech Recognition API not supported.');
      return;
    }
    this.recognition = new this.ctor();
    this.recognition.interimResults = false;
    this.recognition.continuous = true;
    this.attachHandlers();
  }

  // ------------------------------------------------------------------ public API
  isBrowserSupported(): boolean { return !!this.recognition; }

  /** True if the on-device API exists in this browser (language support checked separately). */
  isLocalApiAvailable(): boolean {
    return !!this.ctor && typeof this.ctor.available === 'function' && typeof this.ctor.install === 'function';
  }

  isLocalLanguage(language: string): boolean { return !!LOCAL_LANGS[language]; }

  getSpeechObservable(): Observable<string> { return this.speechSubject.asObservable(); }
  getErrorObservable(): Observable<string> { return this.errorSubject.asObservable(); }
  /** Non-fatal information for the user (e.g. "switched to on-device recognition"). */
  getNoticeObservable(): Observable<string> { return this.noticeSubject.asObservable(); }
  /** Progress text while the on-device model is downloading, null when idle. */
  getStatusObservable(): Observable<string | null> { return this.statusSubject.asObservable(); }
  getListeningStateObservable(): Observable<boolean> { return this.listeningStateSubject.asObservable(); }
  getActiveEngineObservable(): Observable<ActiveEngine> { return this.activeEngineSubject.asObservable(); }

  async startListening(language: string, engine: SpeechEngine = 'auto'): Promise<void> {
    if (!this.recognition) { this.errorSubject.next('Speech recognition is not available in this browser.'); return; }
    if (this.isListening || this.starting) return;
    this.starting = true;
    this.wantListening = true;
    this.language = language;
    this.engineSetting = engine;
    this.fallbackTried = false;
    this.lastErrorWasNetwork = false;
    const active = await this.resolveEngine(language, engine);
    this.starting = false;
    if (!this.wantListening) return; // stopped while the model was downloading
    this.useLocal = active === 'local';
    this.launch();
  }

  stopListening(): void {
    this.wantListening = false;
    if (!this.recognition) return;
    if (this.isListening) {
      try { this.recognition.stop(); } catch { /* already stopped */ }
      this.isListening = false;
      this.listeningStateSubject.next(false);
    }
  }

  /** Applies a new language and/or engine while running (restarts the session by itself). */
  async restart(language: string, engine: SpeechEngine): Promise<void> {
    this.language = language;
    this.engineSetting = engine;
    this.fallbackTried = false;
    this.lastErrorWasNetwork = false;
    if (!this.wantListening) return;
    const active = await this.resolveEngine(language, engine);
    this.useLocal = active === 'local';
    if (this.isListening) {
      try { this.recognition.stop(); } catch { /* ignore */ } // 'end' handler relaunches with the new settings
    } else if (!this.starting) {
      this.launch();
    }
  }

  // ------------------------------------------------------------------ internals
  /** Decides which engine to use, downloading the on-device model when needed. */
  private async resolveEngine(language: string, setting: SpeechEngine): Promise<ActiveEngine> {
    const tag = LOCAL_LANGS[language];
    const canLocal = !!tag && this.isLocalApiAvailable();
    const isEdge = /\bEdg\//.test(navigator.userAgent);
    const preferLocal = setting === 'local' || (setting === 'auto' && isEdge);

    if (!preferLocal) return 'cloud';
    if (!canLocal) {
      if (setting === 'local') {
        this.noticeSubject.next(!tag
          ? 'On-device recognition is not available for this language yet: using the online service.'
          : 'This browser does not offer on-device recognition: using the online service.');
      }
      return 'cloud';
    }
    try {
      const options = { langs: [tag], processLocally: true };
      let availability = await this.ctor.available(options);
      if (availability === 'downloadable' || availability === 'downloading') {
        this.ngZone.run(() => this.statusSubject.next(`Downloading the speech model (${tag})… this happens only once.`));
        const installed = await this.ctor.install(options);
        this.ngZone.run(() => this.statusSubject.next(null));
        availability = installed ? 'available' : 'unavailable';
      }
      if (availability === 'available') return 'local';
    } catch (e) {
      console.warn('On-device speech check failed:', e);
      this.statusSubject.next(null);
    }
    if (setting === 'local') this.noticeSubject.next('On-device recognition is unavailable here: using the online service.');
    return 'cloud';
  }

  private launch(attempt = 0): void {
    if (!this.recognition || !this.wantListening) return;
    const active: ActiveEngine = this.useLocal ? 'local' : 'cloud';
    this.recognition.lang = this.useLocal ? LOCAL_LANGS[this.language] : this.language;
    try { this.recognition.processLocally = this.useLocal; } catch { /* property not supported */ }
    this.activeEngineSubject.next(active);
    try {
      this.recognition.start();
    } catch (e: any) {
      // The previous session may still be shutting down: retry once shortly after.
      if (attempt < 3 && e?.name === 'InvalidStateError') {
        window.setTimeout(() => this.launch(attempt + 1), 300);
        return;
      }
      console.error('recognition.start() failed:', e);
      this.wantListening = false;
      this.isListening = false;
      this.listeningStateSubject.next(false);
      this.errorSubject.next('Could not start speech recognition. Press Start to retry.');
    }
  }

  private attachHandlers(): void {
    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal) continue;
        const transcript = event.results[i][0].transcript.trim();
        if (transcript) this.ngZone.run(() => this.speechSubject.next(transcript));
      }
    };

    this.recognition.onstart = () => this.ngZone.run(() => {
      this.lastErrorWasNetwork = false;
      if (!this.isListening) {
        this.isListening = true;
        this.listeningStateSubject.next(true);
      }
    });

    this.recognition.onerror = (event: any) => this.ngZone.run(() => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.log('Speech recognition error:', event.error);

      if (event.error === 'network') {
        this.lastErrorWasNetwork = true;
        void this.handleNetworkError();
        return;
      }
      let message = `Speech recognition error: ${event.error}`;
      let fatal = false;
      switch (event.error) {
        case 'audio-capture':
          message = 'Could not capture audio. Check that a microphone is connected and enabled.'; fatal = true; break;
        case 'not-allowed':
          message = 'Microphone access denied. Allow the microphone for this extension (lock icon in the address bar) and press Start again.'; fatal = true; break;
        case 'service-not-allowed':
          message = 'Speech recognition is blocked. Check the browser/system privacy settings for speech and the microphone (on Edge/Windows: "Online speech recognition"), then press Start again.'; fatal = true; break;
        case 'language-not-supported':
          message = 'This language is not supported by the selected speech engine.'; fatal = true; break;
      }
      this.errorSubject.next(message);
      if (fatal) {
        this.wantListening = false; // stop for good: no restart loop
        this.isListening = false;
        this.listeningStateSubject.next(false);
      }
    });

    this.recognition.onend = () => this.ngZone.run(() => {
      if (this.wantListening) {
        // Browsers end sessions on their own (silence, limits): continue transparently.
        window.setTimeout(() => this.launch(), this.lastErrorWasNetwork ? 1500 : 250);
      } else if (this.isListening) {
        this.isListening = false;
        this.listeningStateSubject.next(false);
      }
    });
  }

  /** Online service unreachable: try the on-device engine once, otherwise explain what to do. */
  private async handleNetworkError(): Promise<void> {
    const canFallback = !this.useLocal && !this.fallbackTried && this.engineSetting !== 'cloud'
      && !!LOCAL_LANGS[this.language] && this.isLocalApiAvailable();
    if (canFallback) {
      this.fallbackTried = true;
      const active = await this.resolveEngine(this.language, 'local');
      if (active === 'local' && this.wantListening) {
        this.useLocal = true;
        this.noticeSubject.next('Online speech service unreachable: switched to on-device recognition.');
        if (this.isListening) { try { this.recognition.stop(); } catch { /* ignore */ } }
        return;
      }
    }
    const isEdge = /\bEdg\//.test(navigator.userAgent);
    this.errorSubject.next(isEdge
      ? 'Edge cannot reach its online speech service. Use Chrome, or enable on-device recognition (needs a recent Edge with the flag "Speech Recognition with on-device model" at edge://flags, languages: English, Italian, Spanish, German).'
      : 'Speech service unreachable. Check your internet connection, VPN, proxy or firewall.');
  }
}
