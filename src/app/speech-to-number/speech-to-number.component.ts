import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
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

  ngOnInit(): void {
    console.log('SpeechToNumberComponent ngOnInit');
    if (!this.isBrowserSupported) return;

    this.speechSubscription = this.speechToTextService
      .getSpeechObservable()
      .subscribe((text) => {
        this.ngZone.run(() => {
          this.recognizedText = text;
          this.parseSpeechToNumber(text);
          this.errorMessage = ''; 
          if (this.recognizedNumber !== null) {
            console.log(`Number parsed: ${this.recognizedNumber}. Requesting service to conclude and restart to process command.`);
            this.speechToTextService.concludeAndRestartCurrentUtterance();
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
            if (this.recognizedText && this.recognizedNumber !== null) {
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
            } else if (this.recognizedText && this.recognizedNumber === null) {
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
            if (response) console.log('Periodic numbering response:', response);
          });
        }
      }, 9000);
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
            console.log('Active tab is not a standard website. Message not sent. URL:', activeTab.url);
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
    console.log(`Tentativo di parsing per: "${cleanedSpeech}" (lingua: ${currentLangCode})`);

    if (langMap[cleanedSpeech] !== undefined) {
      this.recognizedNumber = langMap[cleanedSpeech];
      return;
    }

    const words = cleanedSpeech.split(/\s+/);
    for (const word of words) {
      if (langMap[word] !== undefined) {
        this.recognizedNumber = langMap[word];
        return;
      }
    }

    const numericValue = parseInt(cleanedSpeech, 10);
    if (!isNaN(numericValue) && numericValue >= 1 && numericValue <= 50) {
      const stringNumeric = String(numericValue);
      if (langMap[stringNumeric] === numericValue) {
        this.recognizedNumber = numericValue;
        return;
      }
    }


    this.errorMessage = `Impossibile riconoscere un numero tra 1 e 50 da: "${speech}"`;
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