import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { SpeechToNumberComponent } from './speech-to-number.component';

describe('SpeechToNumberComponent', () => {
  let component: SpeechToNumberComponent;
  let fixture: ComponentFixture<SpeechToNumberComponent>;

  beforeEach(async () => {
    localStorage.removeItem('numbernavigator.engine');
    localStorage.removeItem('numbernavigator.voice');
    localStorage.removeItem('numbernavigator.keyboard');
    localStorage.removeItem('numbernavigator.keyTimeout');
    await TestBed.configureTestingModule({
      imports: [SpeechToNumberComponent],
      providers: [provideZonelessChangeDetection()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpeechToNumberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize engine setting to auto by default', () => {
    expect(component.engine()).toBe('auto');
  });

  it('should update engine setting and localStorage on engine change', () => {
    component.onEngineChange('local');
    expect(component.engine()).toBe('local');
    expect(localStorage.getItem('numbernavigator.engine')).toBe('local');
  });

  it('should render notice and modelStatus boxes when signals are populated', () => {
    component.notice.set('Test notice message');
    component.modelStatus.set('Downloading model...');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test notice message');
    expect(compiled.textContent).toContain('Downloading model...');
  });

  it('should initialize voice as true and keyboard as false by default', () => {
    expect(component.voiceEnabled()).toBeTrue();
    expect(component.keyboardEnabled()).toBeFalse();
  });

  it('should lock the last enabled navigation method', () => {
    // Attempting to turn off voice while keyboard is false should fail
    component.onVoiceToggle(false);
    expect(component.voiceEnabled()).toBeTrue();

    // Enabling keyboard then disabling voice should work
    component.onKeyboardToggle(true);
    expect(component.keyboardEnabled()).toBeTrue();
    expect(localStorage.getItem('numbernavigator.keyboard')).toBe('1');

    component.onVoiceToggle(false);
    expect(component.voiceEnabled()).toBeFalse();
    expect(localStorage.getItem('numbernavigator.voice')).toBe('0');

    // Now attempting to disable keyboard while voice is false should fail
    component.onKeyboardToggle(false);
    expect(component.keyboardEnabled()).toBeTrue();
  });

  it('should update keyTimeoutMs and localStorage on valid key timeout change', () => {
    component.onKeyTimeoutChange(1500);
    expect(component.keyTimeoutMs()).toBe(1500);
    expect(localStorage.getItem('numbernavigator.keyTimeout')).toBe('1500');
  });

  it('should toggle timed click and update interval correctly', () => {
    expect(component.timedClickEnabled()).toBeFalse();

    component.onTimedClickToggle(true);
    expect(component.timedClickEnabled()).toBeTrue();
    expect(localStorage.getItem('numbernavigator.timedClick')).toBe('1');

    component.onTimedClickIntervalChange(5);
    expect(component.timedClickIntervalSec()).toBe(5);
    expect(localStorage.getItem('numbernavigator.timedClickInterval')).toBe('5');
  });

  it('should allow starting when keyboard is enabled even if offline or voice disabled', () => {
    component.onKeyboardToggle(true);
    component.onVoiceToggle(false);
    expect(component.canStart()).toBeTrue();
  });
});
