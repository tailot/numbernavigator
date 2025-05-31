/**
 * @file speech-to-number.component.ts
 * @description This file defines the SpeechToNumberComponent, the core UI and logic for
 * the speech-to-number conversion feature. It integrates with SpeechToTextService
 * to capture voice input, parses the recognized speech into numbers using numberWordMaps,
 * and communicates with the content script to interact with web pages (e.g., click elements, scroll).
 * It also manages UI elements like language selection, start/stop buttons, and status messages.
 */
import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { SpeechToTextService } from '../services/speech-to-text.service';
import { numberWordMaps } from './number-words';
import { Subscription, interval } from 'rxjs';
import { FormsModule } from '@angular/forms';

/**
 * @interface LanguageOption
 * @description Defines the structure for a language option in the selection dropdown.
 */
interface LanguageOption {
  /** @property {string} name - The display name of the language (e.g., "English", "Italiano"). */
  name: string;
  /** @property {string} code - The language code (e.g., "en", "it") used by the Speech Recognition API. */
  code: string;
}

/**
 * @class SpeechToNumberComponent
 * @implements {OnInit}
 * @implements {OnDestroy}
 * @description Manages the speech-to-number conversion functionality.
 * This component handles user interactions, speech recognition, number parsing,
 * and communication with content scripts for web page interactions.
 */
@Component({
  selector: 'app-speech-to-number',
  imports: [FormsModule],
  templateUrl: './speech-to-number.component.html',
  styleUrls: ['./speech-to-number.component.sass'],
})
export class SpeechToNumberComponent implements OnInit, OnDestroy {
  /**
   * @property {LanguageOption[]} languages - Array of available languages for speech recognition.
   */
  languages: LanguageOption[] = [
    { name: 'English', code: 'en' },
    { name: 'Italiano', code: 'it' },
    { name: 'Español', code: 'es' },
    { name: 'Français', code: 'fr' },
    { name: 'Deutsch', code: 'de' },
    { name: 'العربية (Arabic)', code: 'ar' },
    { name: '日本語 (Japanese)', code: 'ja' },
  ];

  /**
   * @property {boolean} isOnline - Indicates if the browser is currently online.
   * Initialized using `navigator.onLine`. Updated by `HostListener` for 'online'/'offline' events.
   */
  isOnline: boolean = navigator.onLine;
  /**
   * @property {string} selectedLanguage - The language code of the currently selected language for speech recognition.
   * @default 'en' (English)
   */
  selectedLanguage: string = this.languages[0].code; // Default a Inglese
  /**
   * @property {string} recognizedText - The raw text transcript received from the speech recognition service.
   * @default ''
   */
  recognizedText: string | null = null;
  /**
   * @property {number | null} recognizedNumber - The number parsed from `recognizedText`, or null if parsing fails.
   * @default null
   */
  recognizedNumber: number | null = null;
  /**
   * @property {string} errorMessage - Stores error messages related to speech recognition or command execution.
   * @default ''
   */
  errorMessage: string = '';
  /**
   * @property {boolean} isListening - Flag indicating if the speech recognition service is currently active.
   * @default false
   */
  isListening: boolean = false;
  /**
   * @property {boolean} isBrowserSupported - Flag indicating if the browser supports the Speech Recognition API.
   * Set in the constructor based on `SpeechToTextService.isBrowserSupported()`.
   * @default true
   */
  isBrowserSupported: boolean = true;

  /**
   * @property {boolean} isContentScriptNumberingActive - Flag indicating if the content script should be actively numbering clickable elements on the page.
   * @default false
   */
  isContentScriptNumberingActive: boolean = false;
  /**
   * @private
   * @property {Subscription | undefined} numberingIntervalSubscription - Stores the RxJS subscription for the periodic numbering interval.
   * Undefined when numbering is inactive.
   * @default undefined
   */
  private numberingIntervalSubscription?: Subscription;

  /**
   * @private
   * @property {Subscription} speechSubscription - RxJS subscription to the speech recognition results observable from `SpeechToTextService`.
   */
  private speechSubscription!: Subscription;
  /**
   * @private
   * @property {Subscription} errorSubscription - RxJS subscription to the error observable from `SpeechToTextService`.
   */
  private errorSubscription!: Subscription;
  /**
   * @private
   * @property {Subscription} listeningStateSubscription - RxJS subscription to the listening state observable from `SpeechToTextService`.
   */
  private listeningStateSubscription!: Subscription;

  private errorMessages: { [langCode: string]: { [errorKey: string]: string } } = {
    'en': {
      'unsupportedBrowser': 'Speech recognition is not supported by your browser.',
      'mapNotFound': 'Number map not found for language: {langCode}',
      'parseError': 'Could not recognize a number (0-200) from: "{speech}"',
      'noMicrophone': 'Could not capture audio. Ensure the microphone is enabled and permission is granted.',
      'micAccessDenied': 'Microphone access denied. Please allow access in your browser settings.',
      'networkError': 'A network error occurred with speech recognition. Check your connection.',
      'noSpeechDetected': 'No speech detected. Please try again.',
      'genericRecognitionError': 'Speech recognition error: {errorDetails}',
      'contentScriptError': 'Page error on {url}: {error}',
      'sendMessageError': 'System error sending command: {error}',
      'noResponseFromPage': 'No response from page for {action}. Ensure content script is active and page is supported.',
      'unexpectedResponse': 'Unexpected response from page for {action}.',
      'cannotSendToNonWebsite': 'Commands cannot be sent to this type of page (e.g., browser settings, file pages).'
    },
    'it': {
      'unsupportedBrowser': 'Il riconoscimento vocale non è supportato dal tuo browser.',
      'mapNotFound': 'Mappa numerica non trovata per la lingua: {langCode}',
      'parseError': 'Impossibile riconoscere un numero (0-200) da: "{speech}"',
      'noMicrophone': 'Impossibile catturare audio. Assicurati che il microfono sia abilitato e il permesso concesso.',
      'micAccessDenied': 'Accesso al microfono negato. Per favore, consenti l\'accesso nelle impostazioni del browser.',
      'networkError': 'Si è verificato un errore di rete con il riconoscimento vocale. Controlla la tua connessione.',
      'noSpeechDetected': 'Nessun discorso rilevato. Per favore, riprova.',
      'genericRecognitionError': 'Errore di riconoscimento vocale: {errorDetails}',
      'contentScriptError': 'Errore dalla pagina {url}: {error}',
      'sendMessageError': 'Errore di sistema durante l\'invio del comando: {error}',
      'noResponseFromPage': 'Nessuna risposta dalla pagina per {action}. Assicurati che lo script sia attivo e la pagina supportata.',
      'unexpectedResponse': 'Risposta inattesa dalla pagina per {action}.',
      'cannotSendToNonWebsite': 'Non è possibile inviare comandi a questo tipo di pagina (es. impostazioni browser, file locali).'
    },
    'es': {
      'unsupportedBrowser': 'El reconocimiento de voz no es compatible con tu navegador.',
      'mapNotFound': 'No se encontró el mapa numérico para el idioma: {langCode}',
      'parseError': 'No se pudo reconocer un número (0-200) de: "{speech}"',
      'noMicrophone': 'No se pudo capturar el audio. Asegúrate de que el micrófono esté habilitado y con permisos.',
      'micAccessDenied': 'Acceso al micrófono denegado. Por favor, permite el acceso en la configuración de tu navegador.',
      'networkError': 'Ocurrió un error de red con el reconocimiento de voz. Verifica tu conexión.',
      'noSpeechDetected': 'No se detectó voz. Por favor, inténtalo de nuevo.',
      'genericRecognitionError': 'Error de reconocimiento de voz: {errorDetails}',
      'contentScriptError': 'Error de página en {url}: {error}',
      'sendMessageError': 'Error del sistema al enviar el comando: {error}',
      'noResponseFromPage': 'No hubo respuesta de la página para {action}. Asegúrate de que el script de contenido esté activo y la página sea compatible.',
      'unexpectedResponse': 'Respuesta inesperada de la página para {action}.',
      'cannotSendToNonWebsite': 'No se pueden enviar comandos a este tipo de página (ej. configuración del navegador, archivos locales).'
    }
  };

  /**
   * @private
   * @readonly
   * @property {object} fullNumberWordMaps - A local reference to the `numberWordMaps` imported constant,
   * containing language-specific mappings of number words to numeric values.
   */
  private readonly fullNumberWordMaps = numberWordMaps;

  /**
   * @constructor
   * @param {SpeechToTextService} speechToTextService - Service for speech-to-text conversion.
   * @param {ChangeDetectorRef} cdr - Angular ChangeDetectorRef for manual change detection.
   * @description Initializes the component, checks for browser support for speech recognition,
   * and sets an error message if not supported.
   */
  constructor(
    private speechToTextService: SpeechToTextService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('SpeechToNumberComponent CONSTRUCTOR');
    this.isBrowserSupported = this.speechToTextService.isBrowserSupported();
    if (!this.isBrowserSupported) {
      this.errorMessage = this.getErrorMessage('unsupportedBrowser');
      // No need for cdr.markForCheck() here as it's in constructor and view isn't initialized yet.
    }
  }

  /**
   * @method onNetworkOnline
   * @listens window:online
   * @description Host listener that updates `isOnline` to true when the browser comes online.
   * @returns {void}
   */
  @HostListener('window:online')
  onNetworkOnline(): void {
    this.isOnline = true;
    console.log('Connection is back online.');
    this.cdr.markForCheck();
  }

  private getErrorMessage(key: string, replacements?: { [placeholder: string]: string }): string {
    const langCode = this.selectedLanguage.split('-')[0];
    let message = this.errorMessages[langCode]?.[key] || this.errorMessages['en']?.[key];

    if (!message) {
      const unknownErrorFallback = (this.errorMessages['en'] && this.errorMessages['en']['genericRecognitionError'] ? this.errorMessages['en']['genericRecognitionError'] : 'An unknown error occurred. Error key: {key} Details: {errorDetails}')
        .replace('{key}', key)
        .replace('{errorDetails}', 'Unknown key');
      return unknownErrorFallback;
    }

    if (replacements) {
      for (const placeholder in replacements) {
        if (Object.prototype.hasOwnProperty.call(replacements, placeholder)) {
          message = message.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
        }
      }
    }
    return message;
  }

  /**
   * @method onNetworkOffline
   * @listens window:offline
   * @description Host listener that updates `isOnline` to false when the browser goes offline.
   * @returns {void}
   */
  @HostListener('window:offline')
  onNetworkOffline(): void {
    this.isOnline = false;
    console.log('Connection lost. Offline mode.');
    this.cdr.markForCheck();
  }

  /**
   * @method ngOnInit
   * @description Angular lifecycle hook. Subscribes to speech recognition service observables
   * (speech results, errors, listening state) to update component state and trigger actions.
   * Handles logic for sending commands (scroll, click) to the content script based on recognized numbers.
   * @returns {void}
   */
  ngOnInit(): void {
    console.log('SpeechToNumberComponent ngOnInit');
    if (!this.isBrowserSupported) return;

    this.speechSubscription = this.speechToTextService
      .getSpeechObservable()
      .subscribe((text) => {
        this.recognizedText = text;
        this.parseSpeechToNumber(text);
        if (this.recognizedNumber !== null) {
          console.log(`Number parsed: ${this.recognizedNumber}. Requesting service to conclude and restart to process command.`);
          this.speechToTextService.concludeAndRestartCurrentUtterance();
        } else {
          console.log(`Speech recognized: "${text}", but no valid number parsed. Error: "${this.errorMessage}"`);
        }
        this.cdr.markForCheck();
      });

    this.errorSubscription = this.speechToTextService
      .getErrorObservable()
      .subscribe((errorText) => { // Renamed 'error' to 'errorText'
        let errorKey = 'genericRecognitionError';
        let replacements = { errorDetails: errorText };

        if (errorText.includes('No speech detected')) {
          errorKey = 'noSpeechDetected';
          replacements = {};
        } else if (errorText.includes('Could not capture audio') || errorText.includes('audio-capture')) {
          errorKey = 'noMicrophone';
          replacements = {};
        } else if (errorText.includes('Microphone access denied') || errorText.includes('not-allowed')) {
          errorKey = 'micAccessDenied';
          replacements = {};
        } else if (errorText.includes('network error occurred') || errorText.includes('network')) {
          errorKey = 'networkError';
          replacements = {};
        }
        this.errorMessage = this.getErrorMessage(errorKey, replacements);
        this.cdr.markForCheck();
      });

    this.listeningStateSubscription = this.speechToTextService
      .getListeningStateObservable()
      .subscribe((listening) => {
        const previousListeningState = this.isListening;
        this.isListening = listening;

        if (previousListeningState && !this.isListening) {
          console.log(`Listening has stopped. Recognized text: "${this.recognizedText}", Number: ${this.recognizedNumber}, Error: "${this.errorMessage}"`);

          if (this.recognizedNumber === 0) {
            console.log(`Recognized number 0. Sending scrollDown command.`);
            this.sendMessageToActiveTab({ action: "scrollDown" }, (response) => {
              if (response) {
                if (response.sendMessageError) {
                  this.errorMessage = this.getErrorMessage('sendMessageError', { error: response.sendMessageError });
                } else if (response.errorKey === "cannotSendToNonWebsite") {
                  this.errorMessage = this.getErrorMessage('cannotSendToNonWebsite');
                  if (response.originatingUrl) { // Check if originatingUrl is provided
                    console.warn(`Attempted scrollDown on non-website tab: ${response.originatingUrl}`);
                  }
                } else if (response.error && response.url) {
                  this.errorMessage = this.getErrorMessage('contentScriptError', { error: response.error, url: response.url });
                } else if (response.status === "Scrolled down") {
                  this.recognizedText = null;
                  console.log(`Content script confirmed scrollDown.`);
                } else if (response.status === "Error" && response.message) {
                  this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: 'scrollDown' }); // Or a more specific key + response.message
                  console.warn(`Error from content script for scrollDown: ${response.message}`, response);
                } else {
                  this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: 'scrollDown' });
                }
              } else {
                this.errorMessage = this.getErrorMessage('noResponseFromPage', { action: 'scrollDown' });
              }
              this.cdr.markForCheck();
            });
          } else if (this.recognizedNumber === 1) {
            console.log(`Recognized number 1. Sending scrollUp command.`);
            this.sendMessageToActiveTab({ action: "scrollUp" }, (response) => {
              if (response) {
                if (response.sendMessageError) {
                  this.errorMessage = this.getErrorMessage('sendMessageError', { error: response.sendMessageError });
                } else if (response.errorKey === "cannotSendToNonWebsite") {
                  this.errorMessage = this.getErrorMessage('cannotSendToNonWebsite');
                  if (response.originatingUrl) { // Check if originatingUrl is provided
                    console.warn(`Attempted scrollUp on non-website tab: ${response.originatingUrl}`);
                  }
                } else if (response.error && response.url) {
                  this.errorMessage = this.getErrorMessage('contentScriptError', { error: response.error, url: response.url });
                } else if (response.status === "Scrolled up") {
                  this.recognizedText = null;
                  console.log(`Content script confirmed scrollUp.`);
                } else if (response.status === "Error" && response.message) {
                  this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: 'scrollUp' }); // Or a more specific key + response.message
                  console.warn(`Error from content script for scrollUp: ${response.message}`, response);
                } else {
                  this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: 'scrollUp' });
                }
              } else {
                this.errorMessage = this.getErrorMessage('noResponseFromPage', { action: 'scrollUp' });
              }
              this.cdr.markForCheck();
            });
          } else if (this.recognizedText && this.recognizedNumber !== null) { // Existing logic for other numbers (2-50)
            console.log(`Attempting to click element number: ${this.recognizedNumber} from speech: "${this.recognizedText}"`);
            const targetIndex = this.recognizedNumber; // Capture for use in callback
            this.sendMessageToActiveTab(
              { action: "clickElement", number: this.recognizedNumber },
              (response) => {
                if (response) {
                  if (response.sendMessageError) {
                    this.errorMessage = this.getErrorMessage('sendMessageError', { error: response.sendMessageError });
                  } else if (response.errorKey === "cannotSendToNonWebsite") {
                    this.errorMessage = this.getErrorMessage('cannotSendToNonWebsite');
                    if (response.originatingUrl) { // Check if originatingUrl is provided
                      console.warn(`Attempted clickElement on non-website tab: ${response.originatingUrl}`);
                    }
                  } else if (response.error && response.url) {
                    this.errorMessage = this.getErrorMessage('contentScriptError', { error: response.error, url: response.url });
                  } else if (response.status === "Clicked") { // Assuming "Clicked" is the success status
                    this.recognizedNumber = null;
                    this.recognizedText = null;
                    console.log(`Content script confirmed click for number ${targetIndex}.`);
                  } else if (response.status === "Error" && response.message) {
                    this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: `clickElement ${targetIndex}` });
                    console.warn(`Error from content script clicking element ${targetIndex}: ${response.message}`);
                  } else {
                    // this.recognizedNumber = null; // Keep them for debugging if action failed unexpectedly
                    // this.recognizedText = null;
                    this.errorMessage = this.getErrorMessage('unexpectedResponse', { action: `clickElement ${targetIndex}` });
                    console.log(`Unexpected or no status in response from content script for clickElement ${targetIndex}:`, response);
                  }
                } else {
                  this.errorMessage = this.getErrorMessage('noResponseFromPage', { action: `clickElement ${targetIndex}` });
                  console.warn(`No response received from content script for clickElement action on number ${targetIndex}.`);
                }
                this.cdr.markForCheck();
              }
            );
          } else if (this.recognizedText && this.recognizedNumber === null) { // Parsing failed
            console.log(`Listening stopped. Recognized text: "${this.recognizedText}", but no valid number was parsed. Current error: "${this.errorMessage}".`);
            // No specific state change for the view here other than what parseSpeechToNumber might have set for errorMessage
          } else if (!this.recognizedText && !this.errorMessage) {
            console.log(`Listening stopped. No text was recognized. Error: "${this.errorMessage}"`);
            // No specific state change for the view here
          }
        } else if (!previousListeningState && this.isListening) {
          console.log('Listening has (re)started.');
          // Resetting state here might be needed and would require markForCheck if properties are changed.
          // this.recognizedText = null;
          // this.recognizedNumber = null;
          // this.errorMessage = '';
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * @method startRecognition
   * @description Starts the speech recognition process.
   * Resets error messages, recognized text, and number. Calls `SpeechToTextService.startListening`.
   * Does nothing if browser is not supported or already listening.
   * @returns {void}
   */
  startRecognition(): void {
    if (!this.isBrowserSupported || this.isListening) return;
    this.errorMessage = '';
    this.recognizedText = null;
    this.recognizedNumber = null;
    this.speechToTextService.startListening(this.selectedLanguage);
  }

  /**
   * @method stopRecognition
   * @description Stops the speech recognition process by calling `SpeechToTextService.stopListening`.
   * Does nothing if browser is not supported or not currently listening.
   * @returns {void}
   */
  stopRecognition(): void {
    if (!this.isBrowserSupported || !this.isListening) return;
    this.speechToTextService.stopListening();
  }

  /**
   * @method onLanguageChange
   * @param {string} newLanguageCode - The new language code selected by the user.
   * @description Handles changes in language selection. Updates `selectedLanguage`.
   * Stops current recognition if active, and resets component state (text, number, error).
   * @returns {void}
   */
  onLanguageChange(newLanguageCode: string): void {
    this.selectedLanguage = newLanguageCode;

    if (this.isListening) {
      this.stopRecognition();
    }
    this.recognizedNumber = null;
    this.recognizedText = null;
    this.errorMessage = '';
  }

  /**
   * @method toggleContentScriptNumbering
   * @description Toggles the activation state of content script numbering for clickable elements.
   * If activated, sends "numberClickables" message to the content script and starts periodic re-numbering.
   * Starts speech recognition if not already listening.
   * If deactivated, clears any existing interval, sends "clearNumbers" message, and stops recognition if active.
   * @returns {void}
   */
  toggleContentScriptNumbering(): void {
    this.isContentScriptNumberingActive = !this.isContentScriptNumberingActive;

    if (this.isContentScriptNumberingActive) {
      this.numberingIntervalSubscription?.unsubscribe();

      if (!this.isListening) {
        this.startRecognition();
      }

      this.sendMessageToActiveTab({ action: "numberClickables" }, (response) => {
        // console.log('Initial numbering response:', response);
      });

      this.numberingIntervalSubscription = interval(5000).subscribe(() => {
        this.sendMessageToActiveTab({ action: "numberClickables" }, (response) => {
          // console.log('Periodic numbering response:', response);
        });
      });
      console.log('Content script numbering activated, periodic updates started.');
    } else {
      this.numberingIntervalSubscription?.unsubscribe();
      this.numberingIntervalSubscription = undefined;

      if (this.isListening) {
        this.stopRecognition();
      }
      console.log('Content script numbering deactivated, periodic updates stopped.');
    }
  }

  /**
   * @private
   * @method sendMessageToActiveTab
   * @param {any} message - The message object to send to the content script.
   * @param {(response: any) => void} [callback] - Optional callback function to handle the response from the content script.
   * The callback receives the response or an error object if message sending fails.
   * @description Sends a message to the content script of the currently active tab using `chrome.tabs.sendMessage`.
   * Only sends messages to tabs with http/https URLs. Handles errors during message sending.
   * @returns {void}
   */
  private sendMessageToActiveTab(message: any, callback?: (response: any) => void): void {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          const activeTab = tabs[0];
          if (activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
            console.log('Sending message to active web tab:', activeTab.url, 'Message:', message); // Added message to log
            try { // ADDED TRY
              chrome.tabs.sendMessage(activeTab.id!, message, (response) => {
                if (chrome.runtime.lastError) {
                  const errorMessageText = `Error sending message to content script (tabId: ${activeTab.id}): ${chrome.runtime.lastError.message}`;
                  console.warn(errorMessageText, 'Message:', message); // Added message to log
                  if (callback) callback({ sendMessageError: chrome.runtime.lastError.message });
                } else if (callback) {
                  callback(response);
                }
              });
            } catch (e: any) { // ADDED CATCH
              const catchErrorMessage = `Synchronous error sending message (tabId: ${activeTab.id}): ${e.message}`;
              console.error(catchErrorMessage, 'Message:', message, 'Error object:', e); // Added message and error object to log
              if (callback) {
                // Ensure a consistent error structure is sent back, similar to runtime.lastError
                callback({ sendMessageError: `Synchronous error: ${e.message || 'Unknown error'}` });
              }
            }
          } else {
            //console.log('Active tab is not a standard website. Message not sent. URL:', activeTab.url);
            if (callback) {
              callback({ errorKey: "cannotSendToNonWebsite", originatingUrl: activeTab.url }); // MODIFIED LINE
            }
          }
        } else {
          console.warn('No active tab found to send message.');
        }
      });
    } else {
      console.warn('Chrome tabs API not available. Not running in extension context or missing permissions?');
    }
  }

  /**
   * @private
   * @method parseSpeechToNumber
   * @param {string} speech - The speech transcript to parse.
   * @description Parses the given speech string to extract a number based on the selected language.
   * Uses `fullNumberWordMaps` for word-to-number conversion.
   * Also attempts `parseInt` as a fallback for numeric strings.
   * Sets `recognizedNumber` and `errorMessage` based on parsing result.
   * Only considers numbers between 0 and 200 (inclusive) as valid.
   * @returns {void}
   */
  private parseSpeechToNumber(speech: string): void {
    const currentLangCode = this.selectedLanguage.split('-')[0];
    const langMap = this.fullNumberWordMaps[currentLangCode];

    if (!langMap) {
      this.errorMessage = this.getErrorMessage('mapNotFound', { langCode: currentLangCode });
      this.recognizedNumber = null;
      this.cdr.markForCheck(); // Added to ensure UI updates if map not found
      return;
    }

    const cleanedSpeech = speech.toLowerCase().trim();
    //console.log(`parsing: "${cleanedSpeech}" (lingua: ${currentLangCode})`);

    if (langMap[cleanedSpeech] !== undefined) {
      this.recognizedNumber = langMap[cleanedSpeech];
      this.errorMessage = ''; // Clear previous error if number found
      return;
    }

    const words = cleanedSpeech.split(/\s+/);
    for (const word of words) {
      if (langMap[word] !== undefined) {
        this.recognizedNumber = langMap[word];
        this.errorMessage = ''; // Clear previous error if number found
        return;
      }
    }

    const numericValue = parseInt(cleanedSpeech, 10);
    // The system recognizes numbers from 0 to 200. Specific numbers have predefined actions:
    // 0 for scroll down, 1 for scroll up. Other numbers (2-200) can be used for clicking numbered elements if displayed by the content script.
    // This parseInt is a fallback for numeric strings not directly in numberWordMaps.
    if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 200) {
      // Check if this numeric string is explicitly defined in the map,
      // e.g. "0" or "1" is in map, "200" might not be.
      const stringNumeric = String(numericValue);
      if (langMap[stringNumeric] === numericValue) {
        this.recognizedNumber = numericValue;
        this.errorMessage = ''; // Clear previous error if number found
        return;
      }
    }

    // If we reach here, no number (0-200) was parsed.
    this.errorMessage = this.getErrorMessage('parseError', { speech: speech });
    this.recognizedNumber = null;
    this.cdr.markForCheck(); // Added to ensure UI updates if parsing fails
  }

  /**
   * @method ngOnDestroy
   * @description Angular lifecycle hook. Unsubscribes from all RxJS subscriptions
   * to prevent memory leaks. Stops speech recognition if active.
   * Clears the content script numbering interval and any displayed numbers on the page.
   * @returns {void}
   */
  ngOnDestroy(): void {
    this.speechSubscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();
    this.listeningStateSubscription?.unsubscribe();
    this.numberingIntervalSubscription?.unsubscribe();

    if (this.isListening) {
      this.speechToTextService.stopListening();
    }

    if (this.isContentScriptNumberingActive) { 
      this.sendMessageToActiveTab({ action: "clearNumbers" });
    }
  }
}