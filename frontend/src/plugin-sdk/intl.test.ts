import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '../intl/intl';
import { pluginIntl } from './intl';

// Stand in for what the loader will register: a plugin's catalogue, flattened
// under `${code}:` keys. Registering it through the dictionaries signal is
// enough to exercise the namespacing — the layering itself is the loader's.
setDictionaries({
  en: {
    'hello_world:greeting': 'Hello from a plugin',
    'hello_world:clicks': 'Clicked {{count}} times',
    'other_plugin:greeting': 'A different plugin',
  },
});
setLocale('en');

const intl = pluginIntl('hello_world');

describe('pluginIntl', () => {
  it('resolves a key from the plugin namespace', () => {
    expect(intl.t('greeting')).toBe('Hello from a plugin');
  });

  it('cannot collide with another plugin using the same key', () => {
    expect(pluginIntl('other_plugin').t('greeting')).toBe('A different plugin');
  });

  it('interpolates tokens', () => {
    expect(intl.t('clicks', { count: 3 })).toBe('Clicked 3 times');
  });

  it('renders a missing key as itself, namespaced — never blank', () => {
    expect(intl.t('nope')).toBe('hello_world:nope');
  });
});
