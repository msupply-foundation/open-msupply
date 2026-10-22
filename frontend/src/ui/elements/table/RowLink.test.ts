import { describe, expect, it, vi } from 'vitest';
import { leftToBrowser } from './RowLink';
import styles from './DataTable.module.css';

// #271: a click on a row's link (RowLink) is the browser's when it is modified
// — a new tab or window, and the row does nothing — and the app's when plain,
// with the link's own navigation cancelled so the row's onRowClick navigates
// instead. A click on anything else in the row is left exactly as it was.
// Runs in node with the minimal event + target shape the helper touches.

const onLink = {
  closest: (sel: string) => (sel === `.${styles.rowLink}` ? {} : null),
};
const onControl = { closest: () => null };

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

describe('leftToBrowser', () => {
  it('keeps a plain click on the link for the app, cancelling the link', () => {
    const event = click(onLink);
    expect(leftToBrowser(event)).toBe(false);
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it.each([
    ['Cmd', { metaKey: true }],
    ['Ctrl', { ctrlKey: true }],
    ['Shift', { shiftKey: true }],
  ])('leaves a %s-click on the link to the browser', (_name, init) => {
    const event = click(onLink, init);
    expect(leftToBrowser(event)).toBe(true);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('never touches a click that missed the link (a control in a cell)', () => {
    const plain = click(onControl);
    const modifiedClick = click(onControl, { metaKey: true });
    expect(leftToBrowser(plain)).toBe(false);
    expect(leftToBrowser(modifiedClick)).toBe(false);
    expect(plain.preventDefault).not.toHaveBeenCalled();
    expect(modifiedClick.preventDefault).not.toHaveBeenCalled();
  });

  it('tolerates a target that is not an element', () => {
    expect(leftToBrowser(click(null))).toBe(false);
  });
});
