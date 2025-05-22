import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

@Injectable({
  providedIn: 'root',
})
export class SpeechToTextService {
  private recognition: any;
  private isListening = false;
  private speechSubject = new Subject<string>();
  private errorSubject = new Subject<string>();
  private listeningStateSubject = new Subject<boolean>();
  private currentLanguage = '';
  private manualStopInitiated = false;

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

  stopListening(): void {
    this.stopListeningInternal(true);
  }

  public concludeAndRestartCurrentUtterance(): void {
    if (!this.recognition || !this.isListening) {
      console.log('concludeAndRestartCurrentUtterance: Not listening or no recognition object.');
      return;
    }
    console.log('concludeAndRestartCurrentUtterance: Programmatically stopping to trigger onend for restart.');
    this.manualStopInitiated = false;
    this.recognition.stop();
  }

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

  getSpeechObservable(): Observable<string> {
    return this.speechSubject.asObservable();
  }

  getErrorObservable(): Observable<string> {
    return this.errorSubject.asObservable();
  }

  getListeningStateObservable(): Observable<boolean> {
    return this.listeningStateSubject.asObservable();
  }

  isBrowserSupported(): boolean {
    return !!this.recognition;
  }
}