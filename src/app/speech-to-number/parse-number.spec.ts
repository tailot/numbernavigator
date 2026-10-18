import { parseSpokenNumber } from './parse-number';

describe('parseSpokenNumber', () => {
  it('parses digits as returned by Chrome', () => {
    expect(parseSpokenNumber('21', 'en')).toBe(21);
    expect(parseSpokenNumber('0', 'it')).toBe(0);
    expect(parseSpokenNumber('200', 'fr')).toBe(200);
  });
  it('parses number words', () => {
    expect(parseSpokenNumber('twenty one', 'en')).toBe(21);
    expect(parseSpokenNumber('Twenty-two.', 'en')).toBe(22);
    expect(parseSpokenNumber('ventuno', 'it')).toBe(21);
  });
  it('finds the number inside a phrase', () => {
    expect(parseSpokenNumber('number 15 please', 'en')).toBe(15);
    expect(parseSpokenNumber('click twenty one', 'en')).toBe(21);
  });
  it('supports Eastern Arabic and full-width digits', () => {
    expect(parseSpokenNumber('٢١', 'ar')).toBe(21);
    expect(parseSpokenNumber('１５', 'ja')).toBe(15);
  });
  it('rejects out-of-range or non numeric speech', () => {
    expect(parseSpokenNumber('250', 'en')).toBeNull();
    expect(parseSpokenNumber('hello there', 'en')).toBeNull();
    expect(parseSpokenNumber('', 'en')).toBeNull();
  });
});
