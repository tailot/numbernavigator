import { Component, OnInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { SpeechToTextService } from '../services/speech-to-text.service';
import { numberWordMaps } from './number-words';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
interface LanguageOption {
  name: string;
  code: string;
}

@Component({
  selector: 'app-speech-to-number',
  imports: [FormsModule],
  templateUrl: './speech-to-number.component.html',
  styleUrls: ['./speech-to-number.component.sass'],
})
export class SpeechToNumberComponent implements OnInit, OnDestroy {
  languages: LanguageOption[] = [
    { name: 'English', code: 'en' },
    { name: 'Italiano', code: 'it' },
    { name: 'Español', code: 'es' },
    { name: 'Français', code: 'fr' },
    { name: 'Deutsch', code: 'de' },
    { name: 'العربية (Arabic)', code: 'ar' },
    { name: '日本語 (Japanese)', code: 'ja' },
  ];

  isOnline: boolean = navigator.onLine;
  selectedLanguage: string = this.languages[0].code; // Default a Inglese
  recognizedText: string = '';
  recognizedNumber: number | null = null;
  errorMessage: string = '';
  isListening: boolean = false;
  isBrowserSupported: boolean = true;

  isContentScriptNumberingActive: boolean = false;
  private contentScriptNumberingIntervalId: number | null = null;

  private speechSubscription!: Subscription;
  private errorSubscription!: Subscription;
  private listeningStateSubscription!: Subscription;

  private readonly fullNumberWordMaps = numberWordMaps;

  constructor(
    private speechToTextService: SpeechToTextService,
    private ngZone: NgZone
  ) {
    console.log('SpeechToNumberComponent CONSTRUCTOR');
    this.isBrowserSupported = this.speechToTextService.isBrowserSupported();
    if (!this.isBrowserSupported) {
      this.errorMessage = 'Il riconoscimento vocale non è supportato dal tuo browser.';
    }
  }

  @HostListener('window:online')
  onNetworkOnline(): void {
    this.isOnline = true;
    console.log('Connection is back online.');
  }

  @HostListener('window:offline')
  onNetworkOffline(): void {
    this.isOnline = false;
    console.log('Connection lost. Offline mode.');
  }

  ngOnInit(): void {
    console.log('SpeechToNumberComponent ngOnInit');
    if (!this.isBrowserSupported) return;

    this.speechSubscription = this.speechToTextService
      .getSpeechObservable()
      .subscribe((text) => {
        this.ngZone.run(() => {
          this.recognizedText = text;
          this.parseSpeechToNumber(text); // This will set recognizedNumber and potentially errorMessage
          // If recognizedNumber is null, parseSpeechToNumber should have set an errorMessage.
          if (this.recognizedNumber !== null) {
            console.log(`Number parsed: ${this.recognizedNumber}. Requesting service to conclude and restart to process command.`);
            this.speechToTextService.concludeAndRestartCurrentUtterance();
          } else {
            console.log(`Speech recognized: "${text}", but no valid number parsed. Error: "${this.errorMessage}"`);
          }
        });
      });

    this.errorSubscription = this.speechToTextService
      .getErrorObservable()
      .subscribe((error) => {
        this.ngZone.run(() => {
          this.errorMessage = error;
        });
      });

    this.listeningStateSubscription = this.speechToTextService
      .getListeningStateObservable()
      .subscribe((listening) => {
        this.ngZone.run(() => {
          const previousListeningState = this.isListening;
          this.isListening = listening;

          if (previousListeningState && !this.isListening) {
            console.log(`Listening has stopped. Recognized text: "${this.recognizedText}", Number: ${this.recognizedNumber}, Error: "${this.errorMessage}"`);

            if (this.recognizedNumber === 0) {
              console.log(`Recognized number 0. Sending scrollDown command.`);
              this.sendMessageToActiveTab({ action: "scrollDown" }, (response) => {
                if (response) {
                  if (response.sendMessageError) {
                    this.errorMessage = `System error sending scrollDown: ${response.sendMessageError}`;
                    console.warn(this.errorMessage);
                  } else if (response.error && response.url) {
                    this.errorMessage = `${response.error} (URL: ${response.url})`;
                    console.warn(this.errorMessage);
                  } else if (response.status === "Scrolled down") {
                    this.recognizedText = '';
                    console.log(`Content script confirmed scrollDown.`);
                  } else if (response.status === "Error") {
                    this.errorMessage = response.message || `Content script failed to scrollDown.`;
                    console.warn(`Error from content script for scrollDown: ${this.errorMessage}`, response);
                  } else {
                    console.warn(`Unexpected response from content script for scrollDown:`, response);
                    this.errorMessage = 'Unexpected response from page for scrollDown.';
                  }
                } else {
                  console.warn(`No response received from content script for scrollDown action.`);
                  this.errorMessage = 'No response from page for scrollDown. Ensure content script is active.';
                }
              });
            } else if (this.recognizedNumber === 1) {
              console.log(`Recognized number 1. Sending scrollUp command.`);
              this.sendMessageToActiveTab({ action: "scrollUp" }, (response) => {
                 if (response) {
                  if (response.sendMessageError) {
                    this.errorMessage = `System error sending scrollUp: ${response.sendMessageError}`;
                    console.warn(this.errorMessage);
                  } else if (response.error && response.url) {
                    this.errorMessage = `${response.error} (URL: ${response.url})`;
                    console.warn(this.errorMessage);
                  } else if (response.status === "Scrolled up") {
                    this.recognizedText = '';
                    console.log(`Content script confirmed scrollUp.`);
                  } else if (response.status === "Error") {
                    this.errorMessage = response.message || `Content script failed to scrollUp.`;
                    console.warn(`Error from content script for scrollUp: ${this.errorMessage}`, response);
                  } else {
                    console.warn(`Unexpected response from content script for scrollUp:`, response);
                    this.errorMessage = 'Unexpected response from page for scrollUp.';
                  }
                } else {
                  console.warn(`No response received from content script for scrollUp action.`);
                  this.errorMessage = 'No response from page for scrollUp. Ensure content script is active.';
                }
              });
            } else if (this.recognizedText && this.recognizedNumber !== null) { // Existing logic for other numbers (2-50)
              console.log(`Attempting to click element number: ${this.recognizedNumber} from speech: "${this.recognizedText}"`);
              this.sendMessageToActiveTab(
                { action: "clickElement", number: this.recognizedNumber },
                (response) => {
                  if (response) {
                    if (response.sendMessageError) {
                      this.errorMessage = `System error sending command: ${response.sendMessageError}`;
                      console.warn(this.errorMessage);
                    } else if (response.error && response.url) {
                      this.errorMessage = `${response.error} (URL: ${response.url})`;
                      console.warn(this.errorMessage);
                    } else if (response.status === "Clicked") {
                      this.recognizedText = ''
                      console.log(`Content script confirmed click for number ${this.recognizedNumber}.`);
                    } else if (response.status === "Error") {
                      this.errorMessage = response.message || `Content script failed to click element ${this.recognizedNumber}.`;
                      console.warn(`Error from content script clicking element ${this.recognizedNumber}: ${this.errorMessage}`);
                    } else {
                      console.warn(`Unexpected or no status in response from content script for clickElement ${this.recognizedNumber}:`, response);
                    }
                  } else {
                    console.warn(`No response received from content script for clickElement action on number ${this.recognizedNumber}. Ensure content script is active and responsive.`);
                  }
                }
              );
            } else if (this.recognizedText && this.recognizedNumber === null) { // Parsing failed
              console.log(`Listening stopped. Recognized text: "${this.recognizedText}", but no valid number was parsed. Current error: "${this.errorMessage}".`);
            } else if (!this.recognizedText && !this.errorMessage) {
              console.log(`Listening stopped. No text was recognized. Error: "${this.errorMessage}"`);
            }
          } else if (!previousListeningState && this.isListening) {
            console.log('Listening has (re)started.');
            // Qui potresti voler resettare recognizedText/Number se ogni sessione di ascolto deve essere pulita
          }
        });
      });
  }

  startRecognition(): void {
    if (!this.isBrowserSupported || this.isListening) return;
    this.errorMessage = '';
    this.recognizedText = '';
    this.recognizedNumber = null;
    this.speechToTextService.startListening(this.selectedLanguage);
  }

  stopRecognition(): void {
    if (!this.isBrowserSupported || !this.isListening) return;
    this.speechToTextService.stopListening();
  }

  onLanguageChange(newLanguageCode: string): void {
    this.selectedLanguage = newLanguageCode;

    console.log(`Lingua selezionata (ngModelChange), nuovo valore: ${newLanguageCode}`);
    console.log(`this.selectedLanguage è ora (dopo assegnazione esplicita): ${this.selectedLanguage}`);

    if (this.isListening) {
      this.stopRecognition();
    }
    this.recognizedNumber = null;
    this.recognizedText = '';
    this.errorMessage = '';
  }

  toggleContentScriptNumbering(): void {
    this.isContentScriptNumberingActive = !this.isContentScriptNumberingActive;
    if (this.isContentScriptNumberingActive) {
      this.sendMessageToActiveTab({ action: "numberClickables" }, (response) => {
        if (response) console.log('Numbering response:', response);
      });
      if (this.contentScriptNumberingIntervalId !== null) {
        window.clearInterval(this.contentScriptNumberingIntervalId);
      }
      if (!this.isListening) {
        this.startRecognition();
      }
      this.contentScriptNumberingIntervalId = window.setInterval(() => {
        if (this.isContentScriptNumberingActive) { 
          this.sendMessageToActiveTab({ action: "numberClickables" }, (response) => {
            //if (response) console.log('Periodic numbering response:', response);
          });
        }
      }, 5000);
      console.log('Content script numbering activated.');
    } else {
      if (this.contentScriptNumberingIntervalId !== null) {
        window.clearInterval(this.contentScriptNumberingIntervalId);
        this.contentScriptNumberingIntervalId = null;
      }
      this.sendMessageToActiveTab({ action: "clearNumbers" }, (response) => {
        if (response) console.log('Clear numbers response:', response);
      });
      if (this.isListening) {
        this.stopRecognition();
      }
      console.log('Content script numbering deactivated.');
    }
  }

  private sendMessageToActiveTab(message: any, callback?: (response: any) => void): void {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          const activeTab = tabs[0];
          if (activeTab.url && (activeTab.url.startsWith('http://') || activeTab.url.startsWith('https://'))) {
            console.log('Sending message to active web tab:', activeTab.url);
            chrome.tabs.sendMessage(activeTab.id!, message, (response) => {
              if (chrome.runtime.lastError) {
                const errorMessageText = `Error sending message to content script: ${chrome.runtime.lastError.message}`;
                console.warn(errorMessageText, 'Tab ID:', activeTab.id);
                if (callback) callback({ sendMessageError: chrome.runtime.lastError.message });
              } else if (callback) { 
                callback(response); 
              }
            });
          } else {
            //console.log('Active tab is not a standard website. Message not sent. URL:', activeTab.url);
            if (callback) {
              callback({ error: "Cannot send message to non-website tab", url: activeTab.url });
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
  private parseSpeechToNumber(speech: string): void {
    const currentLangCode = this.selectedLanguage.split('-')[0]; 
    const langMap = this.fullNumberWordMaps[currentLangCode];

    if (!langMap) {
      this.errorMessage = `Mappa numerica non trovata per la lingua: ${currentLangCode}`;
      this.recognizedNumber = null;
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
    // Allow 0 for scroll commands, and 1-50 for clickable elements.
    // The numberWordMaps already define 0-50. This parseInt is a fallback.
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
    this.errorMessage = `Impossibile riconoscere un numero (0-200) da: "${speech}"`;
    this.recognizedNumber = null;
  }

  ngOnDestroy(): void {
    this.speechSubscription?.unsubscribe();
    this.errorSubscription?.unsubscribe();
    this.listeningStateSubscription?.unsubscribe();
    if (this.isListening) {
      this.speechToTextService.stopListening();
    }
    if (this.contentScriptNumberingIntervalId !== null) {
      window.clearInterval(this.contentScriptNumberingIntervalId);
      this.contentScriptNumberingIntervalId = null;
    }
    if (this.isContentScriptNumberingActive) { 
      this.sendMessageToActiveTab({ action: "clearNumbers" });
    }
  }
}