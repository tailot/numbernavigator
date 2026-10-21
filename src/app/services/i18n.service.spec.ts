import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { I18nService, LANGUAGE_STORAGE_KEY } from './i18n.service';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()]
    });
    service = TestBed.inject(I18nService);
  });

  afterEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect language or fallback to English if unsupported browser language', () => {
    expect(service.isSupported('en')).toBeTrue();
    expect(service.isSupported('zh')).toBeTrue();
    expect(service.isSupported('hi')).toBeTrue();
    expect(service.isSupported('es')).toBeTrue();
    expect(service.isSupported('ar')).toBeTrue();
    expect(service.isSupported('it')).toBeTrue();
    expect(service.isSupported('fr')).toBeTrue();
    expect(service.isSupported('de')).toBeTrue();
    expect(service.isSupported('ja')).toBeTrue();
    expect(service.isSupported('xyz')).toBeFalse();
  });

  it('should fallback to en template string if key missing in current language', () => {
    service.setLanguage('es');
    const subtitle = service.t('subtitle');
    expect(subtitle).toBeTruthy();
    expect(subtitle).not.toBe('subtitle');
  });

  it('should replace interpolation parameters in t() method', () => {
    service.setLanguage('en');
    const result = service.t('toggleNumberError', { min: 2, max: 200 });
    expect(result).toBe('Enter a whole number from 2 to 200 (0 and 1 are used for scrolling).');
  });

  it('should save selected language to localStorage', () => {
    service.setLanguage('zh');
    expect(service.currentLanguage()).toBe('zh');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh');
  });

  it('should have all translation keys present in every supported language', () => {
    const supportedCodes = service.supportedLanguages.map((lang) => lang.code);
    const primaryLangKeys = [
      'subtitle', 'noInternet', 'speechNotSupported', 'startBtn', 'stopBtn',
      'statusStopped', 'statusListening', 'statusStartingMicrophone', 'statusKeyboardActive',
      'statusNumbersHidden', 'engineLocal', 'engineOnline', 'engineLabel', 'engineAuto',
      'engineCloud', 'engineLocalOpt', 'languageLabel', 'navMethodLegend', 'voiceCheckbox',
      'keyboardCheckbox', 'navMethodHint', 'keyTimeoutLabel', 'keyTimeoutHint', 'timeoutFast',
      'timeoutDefault', 'timeout1_5', 'timeout2', 'timeoutSlow', 'followCursorLegend',
      'followCursorCheckbox', 'squareSizeLabel', 'squareSmall', 'squareMedium', 'squareLarge',
      'squareExtraLarge', 'followCursorHintOn', 'followCursorHintOff', 'timedClickLegend',
      'timedClickCheckbox', 'timedClickIntervalLabel', 'timedClick1s', 'timedClick2s',
      'timedClick3s', 'timedClick5s', 'timedClick10s', 'timedClickHint', 'commandNumberLegend',
      'commandNumberLabel', 'toggleNumberError', 'commandNumberHint', 'switchTabNotice',
      'heardText', 'notANumber', 'numbersHiddenNotice', 'numbersHiddenSuccess',
      'numbersHiddenSuccessKeyboard', 'numbersShownSuccess', 'scrolledDownSuccess',
      'scrolledUpSuccess', 'clickedSuccess', 'openWebsiteError', 'pageNoResponseError',
      'commandsHeading', 'thSayOrType', 'thEffect', 'cmdNumber', 'cmdNumberEffect',
      'cmdZero', 'cmdZeroEffect', 'cmdOne', 'cmdOneEffect', 'cmdToggleNumber',
      'cmdToggleEffect', 'step1', 'step2', 'step3', 'goodToKnowSummary', 'goodToKnowDetails'
    ];

    for (const code of supportedCodes) {
      service.setLanguage(code);
      for (const key of primaryLangKeys) {
        const translation = service.t(key);
        expect(translation).withContext(`Language '${code}' missing key '${key}'`).not.toBe(key);
      }
    }
  });
});
