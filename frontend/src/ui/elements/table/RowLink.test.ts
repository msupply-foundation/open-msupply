import { describe, expect, it, vi } from 'vitest';
import { leftToBrowser } from './RowLink';
import styles from './DataTable.module.css';

// #271: on a row with a link (RowLink), a modified click is never the row's —
// on the link the browser opens a new tab or window, and anywhere else (a
// control, a chip list keeping its pointer events for a `title`) it does
// nothing, rather than moving the current tab. A plain click is the app's, the
// link's own navigation cancelled so the row's onRowClick navigates instead.
// A row without a link keeps every click, as before.
// Runs in node with the minimal event + target shape the helper touches.

const onLink = {
  closest: (sel: string) => (sel === `.${styles.rowLink}` ? {} : null),
};
const offLink = { closest: () => null };

const click = (target: unknown, init: Partial<MouseEvent> = {}) =>
  ({
    target,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...init,
  }) as unknown as MouseEvent & { preventDefault: ReturnType<typeof vi.fn> };

const modified: [string, Partial<MouseEvent>][] = [
  ['Cmd', { metaKey: true }],
  ['Ctrl', { ctrlKey: true }],
  ['Shift', { shiftKey: true }],
];

describe('leftToBrowser', () => {
  it('keeps a plain click on the link for the app, cancelling the link', () => {
    const event = click(onLink);
    expect(leftToBrowser(event, true)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it.each(modified)(
    'leaves a %s-click on the link to the browser',
    (_name, init) => {
      const event = click(onLink, init);
      expect(leftToBrowser(event, true)).toBe(true);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  );

  it('leaves a plain click that missed the link untouched (a control)', () => {
    const event = click(offLink);
    expect(leftToBrowser(event, true)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it.each(modified)(
    'keeps a %s-click that missed the link from opening the row in this tab',
    (_name, init) => {
      const event = click(offLink, init);
      expect(leftToBrowser(event, true)).toBe(true);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
  );

  it('leaves every click on a row without a link to the row', () => {
    const plain = click(offLink);
    const modifiedClick = click(offLink, { metaKey: true });
    expect(leftToBrowser(plain, false)).toBe(false);
    expect(leftToBrowser(modifiedClick, false)).toBe(false);
    expect(plain.preventDefault).not.toHaveBeenCalled();
    expect(modifiedClick.preventDefault).not.toHaveBeenCalled();
  });

  it('tolerates a target that is not an element', () => {
    expect(leftToBrowser(click(null), true)).toBe(false);
  });
});
