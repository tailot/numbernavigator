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

  it('should correctly identify supported local languages', () => {
    expect(service.isLocalLanguage('en')).toBeTrue();
    expect(service.isLocalLanguage('it')).toBeTrue();
    expect(service.isLocalLanguage('es')).toBeTrue();
    expect(service.isLocalLanguage('de')).toBeTrue();
    expect(service.isLocalLanguage('fr')).toBeFalse();
    expect(service.isLocalLanguage('ja')).toBeFalse();
  });

  it('should check if browser is supported', () => {
    expect(typeof service.isBrowserSupported()).toBe('boolean');
  });

  it('should check if local API availability returns a boolean', () => {
    expect(typeof service.isLocalApiAvailable()).toBe('boolean');
  });

  it('should emit notice when local engine is requested on non-supported language', async () => {
    let lastNotice = '';
    service.getNoticeObservable().subscribe(notice => lastNotice = notice);

    await service.startListening('fr', 'local');

    expect(lastNotice).toContain('On-device recognition is not available for this language yet');
  });
});
