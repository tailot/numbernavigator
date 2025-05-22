import { Component } from '@angular/core';
import { SpeechToNumberComponent } from './speech-to-number/speech-to-number.component';

@Component({
  selector: 'app-root',
  imports: [SpeechToNumberComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.sass'
})
export class AppComponent {
  title = 'numbernavigator';
}
