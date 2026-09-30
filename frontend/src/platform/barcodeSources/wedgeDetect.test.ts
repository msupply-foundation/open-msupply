import { describe, expect, it } from 'vitest';
import {
  characterCount,
  classifyKey,
  emptyWedgeState,
  feedKey,
  flushWedge,
  WEDGE_DEFAULTS,
  type CapturedKey,
  type WedgeOutcome,
  type WedgeState,
} from './wedgeDetect';
import type { ScanKey } from './source';
// Assertions read runs back as text, which is the reading layer's job — used
// here only so a test can say "this run is 01234" rather than list positions.
import { FNC1, keysToText } from '@/domain/barcode/keystrokes';

/** A keystroke as the browser would report it. */
const stroke = (
  code: string,
  mods: { shift?: boolean; alt?: boolean; ctrl?: boolean; typed?: string } = {}
): CapturedKey => ({
  code,
  shift: mods.shift ?? false,
  alt: mods.alt ?? false,
  ctrl: mods.ctrl ?? false,
  ...(mods.typed !== undefined ? { typed: mods.typed } : {}),
});

/** What a completed run's key positions decode to, for assertions. */
const textOf = (keys: ScanKey[]) => keysToText(keys);

// Capture asks only whether a position carries a character — the same answer
// on every layout. Which character is the reading layer's question.
describe('classifying a key position', () => {
  it('treats letters, digits, keypad and punctuation as characters', () => {
    for (const code of ['KeyA', 'Digit1', 'Numpad7', 'NumpadDecimal', 'Minus', 'Space']) {
      expect(classifyKey(stroke(code))).toBe('char');
    }
  });

  it('treats the single-key GS1 separator spellings as characters', () => {
    expect(classifyKey(stroke('F8'))).toBe('char');
    expect(classifyKey(stroke('BracketRight', { ctrl: true }))).toBe('char');
    expect(classifyKey(stroke('KeyA', { ctrl: true }))).toBe('char');
  });

  it('treats an Alt+numpad digit as part of a code-entry sequence', () => {
    expect(classifyKey(stroke('Numpad0', { alt: true }))).toBe('alt-digit');
  });

  it('treats bare modifiers and NumLock as neither character nor defect', () => {
    expect(classifyKey(stroke('ShiftLeft'))).toBe('ignore');
    expect(classifyKey(stroke('CapsLock'))).toBe('ignore');
    expect(classifyKey(stroke('NumLock'))).toBe('ignore');
  });

  it('treats a Ctrl combination carrying no character as nothing', () => {
    expect(classifyKey(stroke('F5', { ctrl: true }))).toBe('ignore');
  });

  it('treats the scanner suffix keys as terminators', () => {
    expect(classifyKey(stroke('Enter'))).toBe('terminator');
    expect(classifyKey(stroke('Tab'))).toBe('terminator');
  });

  it('reports a key a barcode cannot hold rather than guessing', () => {
    expect(classifyKey(stroke('Escape'))).toBe('unmappable');
    expect(classifyKey(stroke('ArrowLeft'))).toBe('unmappable');
  });

  it('counts an Alt+numpad sequence as one character', () => {
    const sequence = [
      stroke('Digit0'),
      stroke('NumLock'),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad2', { alt: true }),
      stroke('Numpad9', { alt: true }),
      stroke('NumLock'),
      stroke('Digit1'),
    ];
    expect(characterCount(sequence)).toBe(3);
  });
});

/** Feed a whole keystroke stream; returns every completed run, in order. */
const run = (
  keys: { key: CapturedKey; at: number }[],
  { flushAt }: { flushAt?: number } = {}
) => {
  let state: WedgeState = emptyWedgeState();
  const completed: WedgeOutcome[] = [];
  const suppressed: boolean[] = [];
  for (const { key: k, at } of keys) {
    const step = feedKey(state, k, at);
    state = step.state;
    suppressed.push(step.suppress);
    if (step.completed) completed.push(step.completed);
  }
  if (flushAt !== undefined) {
    const end = flushWedge(state);
    if (end.completed) completed.push(end.completed);
  }
  return { completed, suppressed };
};

const fast = (codes: string[], start = 1000, gap = 10) =>
  codes.map((code, i) => ({ key: stroke(code), at: start + i * gap }));

describe('telling a scanner from a human', () => {
  it('reads a fast run of at least the minimum length as a barcode', () => {
    const { completed } = run(fast(['Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4']), {
      flushAt: 2000,
    });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.kind).toBe('barcode');
    expect(textOf(only.keys)).toBe('01234');
  });

  it('ends a run on the scanner terminator without waiting for the timeout', () => {
    const keys = [...fast(['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'])];
    keys.push({ key: stroke('Enter'), at: 1050 });
    const { completed, suppressed } = run(keys);
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.kind).toBe('barcode');
    expect(textOf(only.keys)).toBe('abcde');
    // The suffix is swallowed, so a scan cannot submit the form underneath.
    expect(suppressed.at(-1)).toBe(true);
  });

  it('lets typing through untouched — no suppression, so no latency', () => {
    // 150ms apart: nobody's keystrokes are ever held back.
    const keys = ['KeyH', 'KeyE', 'KeyL', 'KeyL', 'KeyO'].map((code, i) => ({
      key: stroke(code),
      at: 1000 + i * 150,
    }));
    const { completed, suppressed } = run(keys, { flushAt: 3000 });
    expect(suppressed.every(s => s === false)).toBe(true);
    expect(completed.every(c => c.kind === 'typing' && c.replay === '')).toBe(true);
  });

  it('replays a short fast burst, which is a quick typist and not a scan', () => {
    const keys = [
      { key: stroke('KeyH', { typed: 'h' }), at: 1000 },
      { key: stroke('KeyI', { typed: 'i' }), at: 1010 },
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    // The first character was let through; only the second was held.
    expect(completed).toEqual([{ kind: 'typing', replay: 'i' }]);
  });

  // Typing went through the USER's layout, so it is given back as the OS
  // typed it — never re-derived from the position through the scanner's US
  // table, which would turn an AZERTY user's "a" (the KeyQ position) into "q".
  it('replays what the OS typed, not what the US layout would say', () => {
    const keys = [
      { key: stroke('KeyQ', { typed: 'a' }), at: 1000 },
      { key: stroke('KeyQ', { typed: 'a' }), at: 1010 },
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    expect(completed).toEqual([{ kind: 'typing', replay: 'a' }]);
  });

  it('hands a scan up as positions only, without what the OS typed', () => {
    const keys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].map((code, i) => ({
      key: stroke(code, { typed: code.slice(5) }),
      at: 1000 + i * 10,
    }));
    const { completed } = run(keys, { flushAt: 2000 });
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.keys.every(k => !('typed' in k))).toBe(true);
  });

  it('leaks exactly one character, which the caller then removes', () => {
    const { suppressed } = run(fast(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5']));
    expect(suppressed).toEqual([false, true, true, true, true]);
  });

  it('a held shift does not break the run it belongs to', () => {
    const keys = [
      { key: stroke('ShiftLeft'), at: 1000 },
      ...fast(['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'], 1005),
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.kind).toBe('barcode');
    expect(textOf(only.keys)).toBe('abcde');
  });

  // The whole point of the rewrite: a code that lost a character is a
  // plausible, wrong registry key that no screen can ever correct.
  it('reports a corrupt read rather than handing up a shortened code', () => {
    const keys = [
      ...fast(['Digit1', 'Digit2']),
      { key: stroke('F13'), at: 1025 },
      ...fast(['Digit3', 'Digit4', 'Digit5'], 1035),
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    expect(completed.map(c => c.kind)).toEqual(['corrupt']);
  });

  // Rejecting a read and then discarding what arrived leaves "unable to read
  // a barcode" with nothing behind it. The keystrokes have to survive the
  // failure — the key that could not be placed is the only explanation, and
  // is usually a separator spelled a way the app does not know yet.
  it('carries the keystrokes on a corrupt read', () => {
    const keys = [
      ...fast(['Digit1', 'Digit2']),
      { key: stroke('F13'), at: 1025 },
      ...fast(['Digit3', 'Digit4', 'Digit5'], 1035),
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'corrupt' }>;
    expect(only.kind).toBe('corrupt');
    expect(only.keys.map(k => k.code)).toContain('F13');
    expect(only.keys).toHaveLength(6);
  });

  it('separates two scans arriving back to back', () => {
    const keys = [
      ...fast(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'], 1000),
      ...fast(['KeyA', 'KeyB', 'KeyC', 'KeyD', 'KeyE'], 2000),
    ];
    const { completed } = run(keys, { flushAt: 3000 });
    expect(completed.map(c => c.kind)).toEqual(['barcode', 'barcode']);
    expect(
      completed.map(c =>
        textOf((c as Extract<WedgeOutcome, { kind: 'barcode' }>).keys)
      )
    ).toEqual(['12345', 'abcde']);
  });

  // Mid-run, the whole Alt+numpad sequence has to survive as ONE character
  // and not break the run around it — six keystrokes, one separator.
  it('carries an Alt+numpad separator through into the barcode', () => {
    const keys = [
      ...fast(['Digit0', 'Digit1'], 1000),
      ...fast(
        ['NumLock', 'Numpad0', 'Numpad0', 'Numpad2', 'Numpad9', 'NumLock'],
        1020
      ).map(({ key, at }) => ({
        key: /^Numpad\d$/.test(key.code) ? { ...key, alt: true } : key,
        at,
      })),
      ...fast(['Digit1', 'Digit0'], 1090),
    ];
    const { completed } = run(keys, { flushAt: 2000 });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.kind).toBe('barcode');
    expect(textOf(only.keys)).toBe(`01${FNC1}10`);
  });

  it('leaves the user their own Escape and Enter outside a run', () => {
    const keys = [
      { key: stroke('Escape'), at: 1000 },
      { key: stroke('Enter'), at: 2000 },
    ];
    const { suppressed } = run(keys);
    expect(suppressed).toEqual([false, false]);
  });

  /*
   * Captured from real hardware, 2026-09-17, via the Test scanner screen's
   * keystroke readout. Both labels produced byte-identical text to the same
   * labels read over HID POS on a different scanner — which is the property
   * the barcode registry depends on, since it keys on the code exactly.
   */
  it('reads the captured GS1 label, separator and case intact', () => {
    // The separator arrives as F8 on this scanner; the Zebra spells it
    // differently. Both must land on the same character or one physical
    // label becomes two registry rows.
    const captured = [
      ...'0160366582507989'.split('').map(d => stroke(`Digit${d}`)),
      ...'21'.split('').map(d => stroke(`Digit${d}`)),
      ...'100000087118'.split('').map(d => stroke(`Digit${d}`)),
      stroke('F8'),
      ...'17260131'.split('').map(d => stroke(`Digit${d}`)),
      ...'10'.split('').map(d => stroke(`Digit${d}`)),
      stroke('KeyU', { shift: true }),
      ...'013383'.split('').map(d => stroke(`Digit${d}`)),
      stroke('F8'),
      ...'3072'.split('').map(d => stroke(`Digit${d}`)),
    ].map((key, i) => ({ key, at: 1000 + i * 5 }));

    const { completed } = run(captured, { flushAt: 9000 });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(textOf(only.keys)).toBe(
      '0160366582507989' + '21100000087118' + FNC1 + '17260131' + '10U013383' +
        FNC1 + '3072'
    );
  });

  /*
   * The Zebra's own keystroke stream for the same label, captured verbatim
   * 2026-09-17. Its separator is an Alt-code entry bracketed by NumLock —
   * six keystrokes for one character, and only Windows composes it, so
   * everywhere else it arrives raw.
   *
   * The assertion is byte-identity with what a DIFFERENT scanner produced
   * for the same label over HID POS. That is the property the barcode
   * registry depends on: it keys on the code exactly, so two devices
   * disagreeing by one character means one physical label learned twice.
   */
  it('reads the Zebra capture identically to the HID POS read', () => {
    const d = (text: string) => text.split('').map(c => stroke(`Digit${c}`));
    const altSeparator = [
      stroke('NumLock'),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad0', { alt: true }),
      stroke('Numpad2', { alt: true }),
      stroke('Numpad9', { alt: true }),
      stroke('NumLock'),
    ];
    const captured = [
      ...d('016036658250798921100000087118'),
      ...altSeparator,
      ...d('1726013110'),
      stroke('KeyU', { shift: true }),
      ...d('013383'),
      ...altSeparator,
      ...d('3072'),
    ].map((key, i) => ({ key, at: 1000 + i * 5 }));

    const { completed } = run(captured, { flushAt: 9000 });
    expect(completed).toHaveLength(1);
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(only.kind).toBe('barcode');

    // Exactly what the Zebra produced over HID POS.
    const overHid =
      '016036658250798921100000087118' + FNC1 + '1726013110U013383' + FNC1 + '3072';
    expect(textOf(only.keys)).toBe(overHid);
    expect([...textOf(only.keys)]).toHaveLength(53);
  });

  // The reference implementation keeps only Key* and Digit*, so it drops the
  // slash and yields "PX27052D" — a valid-looking code, one character short,
  // with nothing to signal it.
  it('keeps punctuation the reference implementation deletes', () => {
    const captured = [
      stroke('KeyP', { shift: true }),
      stroke('KeyX', { shift: true }),
      ...'27052'.split('').map(d => stroke(`Digit${d}`)),
      stroke('Slash'),
      stroke('KeyD', { shift: true }),
    ].map((key, i) => ({ key, at: 1000 + i * 5 }));

    const { completed } = run(captured, { flushAt: 9000 });
    const only = completed[0] as Extract<WedgeOutcome, { kind: 'barcode' }>;
    expect(textOf(only.keys)).toBe('PX27052/D');
  });

  it('uses the reference app thresholds', () => {
    expect(WEDGE_DEFAULTS).toEqual({ maxMsBetweenKeys: 50, minBarcodeLength: 5 });
  });
});
