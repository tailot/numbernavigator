import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { SpeechToTextService } from './speech-to-text.service';

describe('SpeechToTextService', () => {
  let service: SpeechToTextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    service = TestBed.inject(SpeechToTextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
