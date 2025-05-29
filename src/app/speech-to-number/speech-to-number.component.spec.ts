import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';

import { SpeechToNumberComponent } from './speech-to-number.component';

describe('SpeechToNumberComponent', () => {
  let component: SpeechToNumberComponent;
  let fixture: ComponentFixture<SpeechToNumberComponent>;

  beforeEach(async () => {
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
});
