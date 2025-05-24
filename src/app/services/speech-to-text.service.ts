/**
 * @file speech-to-text.service.ts
 * @description This file defines the SpeechToTextService, which provides functionality
 * for converting speech to text using the browser's Speech Recognition API.
 * It handles starting and stopping voice recognition, processing results, and managing errors.
 */
import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * @interface IWindow
 * @extends {Window}
 * @description Extends the global Window interface to include properties for the Speech Recognition API,
 * which may be prefixed (webkitSpeechRecognition) or standard (SpeechRecognition).
 */
interface IWindow extends Window {
  /**
   * @property {any} webkitSpeechRecognition - The prefixed version of the Speech Recognition API for WebKit browsers.
   */
  webkitSpeechRecognition: any;
  /**
   * @property {any} SpeechRecognition - The standard Speech Recognition API.
   */
  SpeechRecognition: any;
}

/**
 * @class SpeechToTextService
 * @description Service to manage speech-to-text conversion using the browser's Speech Recognition API.
 * It provides observables for speech results, errors, and listening state.
 */
@Injectable({
  providedIn: 'root',
})
export class SpeechToTextService {
  /**
   * @private
   * @property {any} recognition - Instance of the Speech Recognition API.
   */
  private recognition: any;
  /**
   * @private
   * @property {boolean} isListening - Flag indicating if the service is currently listening for speech.
   * @default false
   */
  private isListening = false;
  /**
   * @private
   * @property {Subject<string>} speechSubject - RxJS Subject to emit recognized speech transcripts.
   */
  private speechSubject = new Subject<string>();
  /**
   * @private
   * @property {Subject<string>} errorSubject - RxJS Subject to emit error messages.
   */
  private errorSubject = new Subject<string>();
  /**
   * @private
   * @property {Subject<boolean>} listeningStateSubject - RxJS Subject to emit the listening state (true if listening, false otherwise).
   */
  private listeningStateSubject = new Subject<boolean>();
  /**
   * @private
   * @property {string} currentLanguage - Stores the language code for the current recognition session.
   * @default ''
   */
  private currentLanguage = '';
  /**
   * @private
   * @property {boolean} manualStopInitiated - Flag to indicate if the listening was stopped manually by the user,
   * which affects the auto-restart behavior.
   * @default false
   */
  private manualStopInitiated = false;

  /**
   * @constructor
   * @param {NgZone} ngZone - Angular NgZone service to run callbacks within Angular's zone for proper change detection.
   * @description Initializes the Speech Recognition API. Checks for browser support and sets up the recognition instance.
   */
  constructor(private ngZone: NgZone) {
    const { webkitSpeechRecognition, SpeechRecognition }: IWindow = window as any;
    const SpeechRecognitionAPI = webkitSpeechRecognition || SpeechRecognition;

    if (!SpeechRecognitionAPI) {
      this.errorSubject.next('Speech Recognition API not supported in this browser.');
      console.error('Speech Recognition API not supported.');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.interimResults = false;
    this.recognition.continuous = true; // Keep listening even after a pause in speech
  }

  /**
   * @private
   * @method initializeRecognition
   * @param {string} language - The language code (e.g., 'en-US', 'it-IT') for speech recognition.
   * @description Initializes or re-initializes the speech recognition instance with the specified language
   * and sets up event handlers for results, errors, start, and end of recognition.
   * @returns {void}
   */
  private initializeRecognition(language: string): void {
    if (!this.recognition) return;

    this.currentLanguage = language;
    this.recognition.lang = language;
    console.log(`Speech Recognition language set to: ${language}`);

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      this.ngZone.run(() => {
        this.speechSubject.next(transcript);
      });
    };

    this.recognition.onerror = (event: any) => {
      this.ngZone.run(() => {
        let errorMessage = "An error occurred during speech recognition.";
        if (event.error) {
          switch (event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again.';
              break;
            case 'audio-capture':
              errorMessage = "Could not capture audio. Ensure the microphone is enabled.";
              break;
            case 'not-allowed':
              errorMessage = "Microphone access denied. Please allow access.";
              break;
            case 'network':
              errorMessage = "A network error occurred. Check your connection.";
              break;
            default:
              errorMessage = `Errore: ${event.error}`;
          }
          console.log('Speech recognition error:', event.error, errorMessage);
        }
        this.errorSubject.next(errorMessage);
        if (this.isListening) {
          this.isListening = false;
          this.listeningStateSubject.next(false);
        }
        this.manualStopInitiated = false;
      });
    };

    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        this.isListening = true;
        this.listeningStateSubject.next(true);
        this.manualStopInitiated = false;
        console.log('Speech recognition started.');
      });
    };

    this.recognition.onend = () => {
      this.ngZone.run(() => {
        console.log('Speech recognition ended.');
        const wasListening = this.isListening;

        if (this.manualStopInitiated) {
          console.log('onEnd: Manual stop was initiated. Ensuring state is false. Not restarting listening.');
          if (wasListening) {
            this.isListening = false;
            this.listeningStateSubject.next(false);
          }
          this.manualStopInitiated = false;
        } else {
          console.log(`onEnd: Not a manual stop. wasListening at start of onEnd: ${wasListening}. Attempting to restart listening if previously listening.`);
          this.isListening = false;
          this.listeningStateSubject.next(false);
          
          if (this.currentLanguage) {
            console.log(`Attempting to restart recognition in ${this.currentLanguage}`);
            try {
              this.recognition.start();
            } catch (e) {
              console.error('Error restarting recognition in onend:', e);
              this.errorSubject.next("Error automatically restarting recognition.");
            }
          } else {
            console.warn('onEnd: Cannot restart listening, currentLanguage not set.');
          }
        }
      });
    };
  }

  /**
   * @method startListening
   * @param {string} language - The language code (e.g., 'en-US', 'it-IT') to use for speech recognition.
   * @description Starts the speech recognition process if it's not already active and the API is initialized.
   * It initializes the recognition with the given language and attempts to start listening.
   * Emits an error if recognition cannot be started.
   * @returns {void}
   */
  startListening(language: string): void {
    if (!this.recognition) {
      this.errorSubject.next('Speech Recognition not initialized.');
      return;
    }
    if (this.isListening) {
      console.warn('Recognition already listening.');
      return;
    }
    this.manualStopInitiated = false;
    this.initializeRecognition(language); 
    try {
      console.log('Calling recognition.start() from startListening method');
      this.recognition.start();
    } catch (e) {
      console.error('Error calling recognition.start() from startListening method:', e);
      this.errorSubject.next("Could not start speech recognition. Already started or other error?");
      this.isListening = false;
      this.listeningStateSubject.next(false);
    }
  }

  /**
   * @method stopListening
   * @description Manually stops the speech recognition service.
   * This is intended to be called by the user to halt listening.
   * It ensures that the listening process does not automatically restart.
   * @returns {void}
   */
  stopListening(): void {
    this.stopListeningInternal(true);
  }

  /**
   * @method concludeAndRestartCurrentUtterance
   * @description Programmatically stops the current speech recognition utterance and immediately attempts to restart it.
   * This is used to force the recognition to process the current audio and then continue listening,
   * effectively segmenting speech or refreshing the recognition cycle without a full manual stop/start.
   * This method sets `manualStopInitiated` to `false` to allow `onend` to restart listening.
   * @returns {void}
   */
  public concludeAndRestartCurrentUtterance(): void {
    if (!this.recognition || !this.isListening) {
      console.log('concludeAndRestartCurrentUtterance: Not listening or no recognition object.');
      return;
    }
    console.log('concludeAndRestartCurrentUtterance: Programmatically stopping to trigger onend for restart.');
    this.manualStopInitiated = false;
    this.recognition.stop();
  }

  /**
   * @private
   * @method stopListeningInternal
   * @param {boolean} [manualStop=false] - Indicates if the stop was initiated manually by a user action (true)
   * or programmatically (false, e.g., by `concludeAndRestartCurrentUtterance`).
   * This flag influences whether the `onend` handler attempts to restart recognition.
   * @description Internal method to stop the speech recognition.
   * Sets a flag if the stop is manual, stops the recognition, and updates the listening state.
   * @returns {void}
   */
  private stopListeningInternal(manualStop: boolean = false): void {
    if (!this.recognition) {
      console.log('stopListeningInternal called but no recognition object.');
      return;
    }

    if (manualStop) {
      this.manualStopInitiated = true;
    } else {
      this.manualStopInitiated = false;
    }

    if (!this.isListening) {
      console.log(`stopListeningInternal called but not currently listening. Manual stop intent: ${manualStop}`);
      return;
    }
    
    console.log(`stopListeningInternal: Stopping recognition. manualStop: ${manualStop}`);
    this.recognition.stop();
    
    this.isListening = false; 
    this.listeningStateSubject.next(false);
    if (manualStop) {
        console.log("Recognition stopped manually (stopListeningInternal). Will not restart from onend.");
    }
  }

  /**
   * @method getSpeechObservable
   * @description Returns an observable that emits recognized speech transcripts.
   * @returns {Observable<string>} An RxJS Observable of strings.
   */
  getSpeechObservable(): Observable<string> {
    return this.speechSubject.asObservable();
  }

  /**
   * @method getErrorObservable
   * @description Returns an observable that emits error messages from the speech recognition process.
   * @returns {Observable<string>} An RxJS Observable of strings.
   */
  getErrorObservable(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  /**
   * @method getListeningStateObservable
   * @description Returns an observable that emits the current listening state (true if listening, false otherwise).
   * @returns {Observable<boolean>} An RxJS Observable of booleans.
   */
  getListeningStateObservable(): Observable<boolean> {
    return this.listeningStateSubject.asObservable();
  }

  /**
   * @method isBrowserSupported
   * @description Checks if the browser supports the Speech Recognition API.
   * @returns {boolean} True if supported, false otherwise.
   */
  isBrowserSupported(): boolean {
    return !!this.recognition;
  }
}