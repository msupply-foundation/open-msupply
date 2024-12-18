import { RegexUtils } from './RegexUtils';

describe('ParseHTML', () => {
  const snippetWithViewBox = `<svg viewBox="0 0 207 209.9">
	<path d="M119.1,62.2c1-2.3,2.2-4.5,3.6-6.6c0.7-1,1.4-1.7,2.1-2.7c-0.4,0-0.7,0.1-1,0.3c-0.7,0.5-1,1.3-1.5,1.7"/>
    </svg>`;
  const snippetWithoutViewBox =
    '<svg><path d="M119.1,62.2c1-2.3,2.2-4.5,3.6-6.6c0.7-1,1.4-1.7,2.1-2.7c-0.4"/></svg>';
  const bigSnippet = `<div>
        <p>some text</p>
        <svg viewBox="0 0 207 209.9">
            <path d="M119.1,62.2c1-2.3"/>
        </svg>
    </div>`;

  it('extracts an svg component', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithViewBox);
    expect(svgComponent).toBeDefined();
    expect(svgComponent?.type).toBe('svg');
  });

  it('extracts an svg component from a block of html', () => {
    const svgComponent = RegexUtils.extractSvg(bigSnippet);
    expect(svgComponent?.type).toBe('svg');
  });

  it('extracts an svg component and retains viewBox', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithViewBox);
    expect(svgComponent?.props?.viewBox).toBe('0 0 207 209.9');
  });

  it('extracts an svg component without viewBox', () => {
    const svgComponent = RegexUtils.extractSvg(snippetWithoutViewBox);
    expect(svgComponent?.type).toBe('svg');
  });

  it('applies the supplied style', () => {
    const style = { width: 100 };
    const svgComponent = RegexUtils.extractSvg(snippetWithoutViewBox, style);
    expect(svgComponent?.props?.style).toBe(style);
  });
});

describe('String matching for object properties', () => {
  const obj = { id: 'green', name: 'blue', colour: 'orange' };

  it('matches all properties of an object', () => {
    expect(
      RegexUtils.matchObjectProperties('oran', obj, ['id', 'name', 'colour'])
    ).toBeTruthy();
    expect(
      RegexUtils.matchObjectProperties('blue', obj, ['id', 'name', 'colour'])
    ).toBeTruthy();
    expect(
      RegexUtils.matchObjectProperties('green', obj, ['id', 'name', 'colour'])
    ).toBeTruthy();
  });

  it('matches within the string', () => {
    expect(
      RegexUtils.matchObjectProperties('ee', obj, ['id', 'name', 'colour'])
    ).toBeTruthy();
  });

  it('matches only the props specified', () => {
    expect(
      RegexUtils.matchObjectProperties('ee', obj, ['name', 'colour'])
    ).toBeFalsy();
  });

  it('matches all props if no keys specified', () => {
    expect(RegexUtils.matchObjectProperties('oran', obj)).toBeTruthy();
    expect(RegexUtils.matchObjectProperties('blue', obj)).toBeTruthy();
    expect(RegexUtils.matchObjectProperties('green', obj)).toBeTruthy();
  });

  describe('escapeChars', () => {
    expect(RegexUtils.escapeChars('a')).toBe('a');
    expect(RegexUtils.escapeChars('about[ ]time')).toBe('about\\[ \\]time');
  });
});

describe('formatTemplateString', () => {
  it('formats the string as expected', () => {
    expect(
      RegexUtils.formatTemplateString('Hello ${name}', { name: 'world' })
    ).toBe('Hello world');
  });

  it('extracts nested properties', () => {
    expect(
      RegexUtils.formatTemplateString('My name is ${user.name}', {
        user: { name: 'Frodo' },
      })
    ).toBe('My name is Frodo');
  });

  it('formats with the default value if required', () => {
    expect(
      RegexUtils.formatTemplateString('Hello ${name}', { nom: 'world' })
    ).toBe('Hello Not found');
  });

  it('handles undefined', () => {
    expect(
      RegexUtils.formatTemplateString('Hello ${name}', { name: undefined })
    ).toBe('Hello Not found');
  });
  it('handles blanks', () => {
    expect(RegexUtils.formatTemplateString('Hello ${name}', { name: '' })).toBe(
      'Hello '
    );
  });
});

describe('Check if email is valid', () => {
  it('rejects empty space in email', () => {
    expect(RegexUtils.checkEmailIsValid('t est@email.com')).toBeFalsy();
    expect(RegexUtils.checkEmailIsValid(' test@email.com')).toBeFalsy();
    expect(RegexUtils.checkEmailIsValid('test@email.com ')).toBeFalsy();
  });
  it('rejects email with no @ symbol', () => {
    expect(RegexUtils.checkEmailIsValid('testemail.com')).toBeFalsy();
  });
  it('rejects email with multiple @ symbols', () => {
    expect(RegexUtils.checkEmailIsValid('test@@email.com')).toBeFalsy();
  });
  it('rejects email with no domain', () => {
    expect(RegexUtils.checkEmailIsValid('test@email')).toBeFalsy();
    expect(RegexUtils.checkEmailIsValid('test@email.')).toBeFalsy();
  });
  it('rejects multiple periods(..) in the domain', () => {
    expect(RegexUtils.checkEmailIsValid('test@email..com')).toBeFalsy();
  });
  it('rejects period(.) straight after @ symbol', () => {
    expect(RegexUtils.checkEmailIsValid('test@.email.com')).toBeFalsy();
  });
  it('rejects empty string before @ symbol', () => {
    expect(RegexUtils.checkEmailIsValid('@email.com')).toBeFalsy();
  });
  it('rejects blank email', () => {
    expect(RegexUtils.checkEmailIsValid('')).toBeFalsy();
  });
  it('accepts correctly formatted email', () => {
    expect(RegexUtils.checkEmailIsValid('test@email.com')).toBeTruthy();
    expect(
      RegexUtils.checkEmailIsValid('test.user_1@msupply.foundation')
    ).toBeTruthy();
    expect(RegexUtils.checkEmailIsValid('test@email.domain.com')).toBeTruthy();
  });
});
