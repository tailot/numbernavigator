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
    localStorage.removeItem('numbernavigator.scrollDownNumber');
    localStorage.removeItem('numbernavigator.scrollUpNumber');
    localStorage.removeItem('numbernavigator.toggleNumber');
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

  it('should initialize special command numbers to defaults and load saved values', () => {
    expect(component.scrollDownNumber()).toBe(0);
    expect(component.scrollUpNumber()).toBe(1);
    expect(component.toggleNumber()).toBe(99);
  });

  it('should step option values while skipping duplicate numbers assigned to other options', () => {
    // Current: scrollDown=0, scrollUp=1, toggle=99
    // Stepping scrollDown UP (+1): 0 + 1 = 1 is reserved by scrollUp, so it must skip to 2!
    component.stepOption('scrollDown', 1);
    expect(component.scrollDownNumber()).toBe(2);
    expect(localStorage.getItem('numbernavigator.scrollDownNumber')).toBe('2');

    // Stepping scrollUp DOWN (-1): 1 - 1 = 0 is reserved by scrollDown (0 is free now because scrollDown is 2)
    component.stepOption('scrollUp', -1);
    expect(component.scrollUpNumber()).toBe(0);
  });

  it('should prevent duplicate assignment when typed manually', () => {
    // Current: scrollDown=0, scrollUp=1, toggle=99
    const dummyInput = document.createElement('input');
    dummyInput.value = '1'; // Attempt to set scrollDown to 1 (which is assigned to scrollUp)

    component.onSpecialNumberChange('scrollDown', dummyInput);
    expect(component.scrollDownNumber()).toBe(0); // unchanged
    expect(component.specialNumberError()).toBeTruthy();
    expect(dummyInput.value).toBe('0'); // reverted
  });
});
