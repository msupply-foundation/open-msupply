import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '@/intl/intl';
import commonEn from '@/intl/locales/en/common.json';
import { stepTabName } from './stepTabName';

// Real English strings, so the cases read as a screen reader would hear them.
setDictionaries({ en: commonEn });
setLocale('en');

describe('stepTabName', () => {
  it('reads the label first, then the mark', () => {
    expect(stepTabName('Plan', 'done')).toBe('Plan, Done');
    expect(stepTabName('Source', 'current')).toBe('Source, Current step');
    expect(stepTabName('Evaluate', 'notStarted')).toBe('Evaluate, Not started');
  });

  it('adds the attention note after the mark', () => {
    expect(stepTabName('Source', 'notStarted', 'Incoterm not filled in')).toBe(
      'Source, Not started. Needs attention: Incoterm not filled in'
    );
  });
});
