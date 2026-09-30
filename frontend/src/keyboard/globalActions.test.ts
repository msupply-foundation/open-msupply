import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGlobalActions } from './globalActions';
import { registeredActions } from '../ui/utils/keyActions';
import { ESCAPE } from '../ui/utils/shortcuts';

// The Escape ladder's tail (spec/keyboard KB-X5). Node environment, so
// `document` is stubbed with just the two queries the rung makes.

const escapeRung = () =>
  registeredActions().find(action => action.shortcut === ESCAPE)!;

const setUp = (openModal: boolean) => {
  vi.stubGlobal('document', {
    querySelectorAll: () => [],
    querySelector: (selector: string) =>
      selector === 'dialog:modal' && openModal ? {} : null,
  });
  const handlers = {
    syncNow: vi.fn(),
    openSync: vi.fn(),
    requestLogout: vi.fn(),
    exitFullScreen: vi.fn(() => false),
    navigateUp: vi.fn(),
  };
  createGlobalActions(handlers);
  return handlers;
};

afterEach(() => {
  for (const action of registeredActions()) action.dispose();
  vi.unstubAllGlobals();
});

describe('KB-X5 — Escape navigates up, except under an open modal', () => {
  it('navigates up with no dialog open', () => {
    const handlers = setUp(false);
    escapeRung().run();
    expect(handlers.navigateUp).toHaveBeenCalledOnce();
  });
  it('stops at an open modal dialog — a press that escaped it (focus on <body>) never leaves the screen beneath', () => {
    const handlers = setUp(true);
    escapeRung().run();
    expect(handlers.navigateUp).not.toHaveBeenCalled();
    expect(handlers.exitFullScreen).not.toHaveBeenCalled();
  });
});
