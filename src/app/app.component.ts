/**
 * @file app.component.ts
 * @description This file defines the root component of the Angular application.
 * The AppComponent serves as the main entry point and container for all other components.
 */
import { Component } from '@angular/core';
import { SpeechToNumberComponent } from './speech-to-number/speech-to-number.component';

/**
 * @class AppComponent
 * @description The root component of the application.
 * It initializes the main view and contains the SpeechToNumberComponent.
 */
@Component({
  selector: 'app-root',
  imports: [SpeechToNumberComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent {
  /**
   * @property {string} title
   * @description The title of the application.
   */
  title = 'numbernavigator';
}
