import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ALT_D,
  ALT_M,
  ALT_N,
  ALT_S,
  ALT_SHIFT_M,
  CTRL_1,
  CTRL_S,
  ESCAPE,
  MOD_K,
  PLUS,
  ariaKeyshortcuts,
  matches,
  shortcutLabel,
} from './shortcuts';
import { setDictionaries, setLocale } from '../../intl/intl';
import commonEn from '../../intl/locales/en/common.json';

// The modifier spellings are locale keys, not literals, so the label tests need
// a real dictionary — seeded directly, as intl.test.ts does.
setDictionaries({ en: commonEn });
setLocale('en');

// What these tests pin down is the set of things a naive
// { alt, ctrl, shift, meta, key } record gets WRONG, because each one is a real
// break on a real keyboard rather than a nicety (kdd/keyboard-layer):
//
//   1. macOS Option+letter delivers a composed character or a dead key in
//      `event.key`, so letters must match `event.code`;
//   2. AZERTY Ctrl+1 delivers `key === '&'`, same reason;
//   3. Cmd+K on macOS and Ctrl+K elsewhere is ONE binding (`mod`), and Ctrl+K
//      on a Mac must NOT fire it;
//   4. a bare-character binding ('+') arrives WITH shiftKey on most layouts, so
//      shift must not be compared for key-matched bindings;
//   5. Alt+M and Alt+Shift+M are different bindings on the same letter.
//
// The tests run in the node environment (vitest.config.ts), so `navigator` is
// stubbed per-platform and KeyboardEvent is a plain shape — the matcher reads
// only the six fields below.

const press = (init: {
  code?: string;
  key?: string;
  alt?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}): KeyboardEvent =>
  ({
    code: init.code ?? '',
    key: init.key ?? '',
    altKey: init.alt === true,
    ctrlKey: init.ctrl === true,
    shiftKey: init.shift === true,
    metaKey: init.meta === true,
  }) as KeyboardEvent;

const onMac = () => vi.stubGlobal('navigator', { platform: 'MacIntel' });
const onWindows = () => vi.stubGlobal('navigator', { platform: 'Win32' });

afterEach(() => vi.unstubAllGlobals());

describe('matches', () => {
  it('matches a letter by code, so macOS Option+M still fires', () => {
    onMac();
    // The real event macOS delivers for Option+M: key is the composed 'µ'.
    expect(matches(ALT_M, press({ code: 'KeyM', key: 'µ', alt: true }))).toBe(
      true
    );
  });

  it('matches a letter by code, so macOS Option+N (a dead key) still fires', () => {
    onMac();
    // Option+N is a dead key for the tilde; `key` is 'Dead', not 'n'.
    expect(
      matches(ALT_N, press({ code: 'KeyN', key: 'Dead', alt: true }))
    ).toBe(true);
  });

  it('matches a digit by code, so AZERTY Ctrl+1 still fires', () => {
    onWindows();
    // AZERTY delivers '&' for the unshifted Digit1 key.
    expect(
      matches(CTRL_1, press({ code: 'Digit1', key: '&', ctrl: true }))
    ).toBe(true);
  });

  it('distinguishes Alt+M from Alt+Shift+M', () => {
    onWindows();
    const withShift = press({ code: 'KeyM', key: 'M', alt: true, shift: true });
    const withoutShift = press({ code: 'KeyM', key: 'm', alt: true });
    expect(matches(ALT_M, withoutShift)).toBe(true);
    expect(matches(ALT_M, withShift)).toBe(false);
    expect(matches(ALT_SHIFT_M, withShift)).toBe(true);
    expect(matches(ALT_SHIFT_M, withoutShift)).toBe(false);
  });

  it('resolves mod to Meta on macOS and Control elsewhere', () => {
    onMac();
    expect(matches(MOD_K, press({ code: 'KeyK', key: 'k', meta: true }))).toBe(
      true
    );
    // Ctrl+K on a Mac is NOT the palette — the other modifier must not fire it.
    expect(matches(MOD_K, press({ code: 'KeyK', key: 'k', ctrl: true }))).toBe(
      false
    );

    onWindows();
    expect(matches(MOD_K, press({ code: 'KeyK', key: 'k', ctrl: true }))).toBe(
      true
    );
    expect(matches(MOD_K, press({ code: 'KeyK', key: 'k', meta: true }))).toBe(
      false
    );
  });

  it('ignores shift for a key-matched bare character, since the layout supplies it', () => {
    onWindows();
    // US layout delivers '+' as Shift+Equal. Comparing shiftKey would make the
    // binding unpressable (KB-L2).
    expect(matches(PLUS, press({ code: 'Equal', key: '+', shift: true }))).toBe(
      true
    );
    // Numpad + arrives without shift, and must fire too.
    expect(matches(PLUS, press({ code: 'NumpadAdd', key: '+' }))).toBe(true);
  });

  it('matches Escape by key', () => {
    onWindows();
    expect(matches(ESCAPE, press({ code: 'Escape', key: 'Escape' }))).toBe(
      true
    );
  });

  it('does not fire a non-mod binding while Meta is held', () => {
    onWindows();
    // A held Meta means the user is reaching for a browser or OS command.
    expect(
      matches(ALT_D, press({ code: 'KeyD', key: 'd', alt: true, meta: true }))
    ).toBe(false);
  });

  it('requires the exact modifier set', () => {
    onWindows();
    expect(matches(ALT_D, press({ code: 'KeyD', key: 'd' }))).toBe(false);
    expect(
      matches(ALT_D, press({ code: 'KeyD', key: 'd', alt: true, ctrl: true }))
    ).toBe(false);
    expect(matches(CTRL_S, press({ code: 'KeyS', key: 's', ctrl: true }))).toBe(
      true
    );
    // Alt+S and Ctrl+S are different bindings on the same letter.
    expect(matches(ALT_S, press({ code: 'KeyS', key: 's', ctrl: true }))).toBe(
      false
    );
  });
});

describe('ariaKeyshortcuts', () => {
  it('emits the ARIA grammar, not the platform spelling', () => {
    onMac();
    // Even on a Mac the ARIA value uses the canonical modifier names.
    expect(ariaKeyshortcuts(ALT_SHIFT_M)).toBe('Alt+Shift+M');
    expect(ariaKeyshortcuts(CTRL_S)).toBe('Control+S');
    expect(ariaKeyshortcuts(ESCAPE)).toBe('Escape');
    expect(ariaKeyshortcuts(CTRL_1)).toBe('Control+1');
    expect(ariaKeyshortcuts(MOD_K)).toBe('Meta+K');

    onWindows();
    expect(ariaKeyshortcuts(MOD_K)).toBe('Control+K');
  });
});

describe('shortcutLabel', () => {
  it('spells Alt as Option and mod as Command on macOS (KB-M1)', () => {
    onMac();
    expect(shortcutLabel(ALT_D)).toBe('Option+D');
    expect(shortcutLabel(ALT_SHIFT_M)).toBe('Option+Shift+M');
    expect(shortcutLabel(MOD_K)).toBe('Command+K');
  });

  it('spells Alt as Alt and mod as Control elsewhere (KB-M1)', () => {
    onWindows();
    expect(shortcutLabel(ALT_D)).toBe('Alt+D');
    expect(shortcutLabel(ALT_SHIFT_M)).toBe('Alt+Shift+M');
    expect(shortcutLabel(MOD_K)).toBe('Control+K');
  });
});
