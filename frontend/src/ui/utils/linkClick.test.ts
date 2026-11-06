import { describe, expect, it, vi } from 'vitest';
import { isPlainClick, onLinkClick } from './linkClick';

// #271: a destination that is a real link leaves every click the browser would
// open elsewhere (a new tab, a new window, a download) to the browser, and
// keeps only the plain click for the app. Runs in node with the minimal event
// shape the helpers touch.

const click = (init: Partial<MouseEvent> = {}) => {
  const event = {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...init,
  };
  return event as unknown as MouseEvent & {
    preventDefault: ReturnType<typeof vi.fn>;
  };
};

const modified: [string, Partial<MouseEvent>][] = [
  ['Cmd', { metaKey: true }],
  ['Ctrl', { ctrlKey: true }],
  ['Shift', { shiftKey: true }],
  ['Alt', { altKey: true }],
  ['a non-primary button', { button: 1 }],
];

describe('isPlainClick', () => {
  it('is a primary-button click with no modifier', () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it.each(modified)('is not a click with %s', (_name, init) => {
    expect(isPlainClick(click(init))).toBe(false);
  });
});

describe('onLinkClick', () => {
  it('runs the action on a plain click and cancels the link', () => {
    const action = vi.fn();
    const event = click();
    onLinkClick(event, '/rc/store/inventory/stock', action);
    expect(action).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it.each(modified)('leaves a click with %s to the browser', (_name, init) => {
    const action = vi.fn();
    const event = click(init);
    onLinkClick(event, '/rc/store/inventory/stock', action);
    expect(action).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('runs the action on any click when there is no href (a button)', () => {
    const action = vi.fn();
    const event = click({ metaKey: true });
    onLinkClick(event, undefined, action);
    expect(action).toHaveBeenCalledOnce();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
