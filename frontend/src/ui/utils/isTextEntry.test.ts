import { describe, it, expect } from 'vitest';
import { isTextEntry } from './isTextEntry';

// This predicate is the ONE answer to "does a keystroke here mean text, not a
// command?", read by four rules (KB-1, KB-X5, KB-N2, KB-E2). The distinction
// that carries the weight: a checkbox, radio or button is an <input> that
// swallows nothing, so Alt+N pressed on a checked box MUST still fire.
//
// Runs in the node environment like the rest of the suite (vitest.config.ts),
// with the minimal element shape the predicate touches — the same approach
// createFocusTarget.test.ts takes, and the reason the predicate reads tagName
// rather than `instanceof`.

const fake = (
  tagName: string,
  attrs: Record<string, string> = {},
  isContentEditable = false
): Element =>
  ({
    tagName,
    isContentEditable,
    getAttribute: (name: string) => attrs[name] ?? null,
  }) as unknown as Element;

const input = (type?: string) =>
  fake('INPUT', type === undefined ? {} : { type });

describe('isTextEntry', () => {
  it('is true for inputs that accept typed characters', () => {
    for (const type of [
      'text',
      'search',
      'url',
      'tel',
      'email',
      'password',
      'number',
      'date',
      'datetime-local',
      'month',
      'week',
      'time',
    ])
      expect(isTextEntry(input(type))).toBe(true);
  });

  it('treats an absent or unrecognised type as text, matching the browser', () => {
    expect(isTextEntry(input())).toBe(true);
    // An unknown type renders as a text field, so it swallows text too.
    expect(isTextEntry(input('totally-made-up'))).toBe(true);
  });

  it('is false for inputs that swallow nothing', () => {
    // The whole reason the predicate checks `type`: a shortcut must still fire
    // while one of these holds focus.
    for (const type of [
      'checkbox',
      'radio',
      'button',
      'submit',
      'reset',
      'file',
      'range',
      'color',
      'image',
      'hidden',
    ])
      expect(isTextEntry(input(type))).toBe(false);
  });

  it('ignores the case of the type attribute', () => {
    expect(isTextEntry(input('CHECKBOX'))).toBe(false);
  });

  it('is true for a textarea and a select', () => {
    expect(isTextEntry(fake('TEXTAREA'))).toBe(true);
    // KB-N2 names select alongside input and textarea.
    expect(isTextEntry(fake('SELECT'))).toBe(true);
  });

  it('is true for an element made editable by an ancestor', () => {
    // A <span> inside a contenteditable host carries no attribute of its own.
    expect(isTextEntry(fake('SPAN', {}, true))).toBe(true);
  });

  it('is true for a role=combobox whose focusable is not an input', () => {
    expect(isTextEntry(fake('DIV', { role: 'combobox' }))).toBe(true);
  });

  it('is false for buttons, links, rows and plain containers', () => {
    expect(isTextEntry(fake('BUTTON'))).toBe(false);
    expect(isTextEntry(fake('A', { href: '#' }))).toBe(false);
    expect(isTextEntry(fake('TR'))).toBe(false);
    expect(isTextEntry(fake('DIV'))).toBe(false);
  });

  it('is false for nothing', () => {
    expect(isTextEntry(null)).toBe(false);
    expect(isTextEntry(undefined)).toBe(false);
  });
});
