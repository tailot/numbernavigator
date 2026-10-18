import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { SpeechToNumberComponent } from './speech-to-number.component';

describe('SpeechToNumberComponent', () => {
  let component: SpeechToNumberComponent;
  let fixture: ComponentFixture<SpeechToNumberComponent>;

  beforeEach(async () => {
    localStorage.removeItem('numbernavigator.engine');
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
});
