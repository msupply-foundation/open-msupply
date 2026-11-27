import { describe, expect, it, vi } from 'vitest';
import { startKeepingFocusedFieldInView } from './keepFocusedFieldInView';

/*
 * The on-screen keyboard shrinks the page; a focused text field must not be
 * left under it, however it got focus (#2593, inbound OMS-REG-REPL-09.49). The
 * suite runs in node, so the window is a stand-in: a visual viewport that is an
 * EventTarget with a height, a focused element, and requestAnimationFrame run
 * at once.
 */

const field = (tagName: string, type?: string) => ({
  tagName,
  getAttribute: (name: string) => (name === 'type' ? (type ?? null) : null),
  scrollIntoView: vi.fn(),
});

const fakeWindow = (active: ReturnType<typeof field> | null) => {
  const target = new EventTarget();
  const viewport = {
    height: 800,
    scale: 1,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
  };
  const win = {
    visualViewport: viewport,
    document: { activeElement: active },
    requestAnimationFrame: (run: () => void) => {
      if (deferFrames) {
        frames.set(++nextFrame, run);
        return nextFrame;
      }
      run();
      return 1;
    },
    cancelAnimationFrame: (id: number) => {
      frames.delete(id);
    },
  };
  // Frames run at once unless a test defers them, to have several resizes
  // land inside one frame.
  let deferFrames = false;
  let nextFrame = 0;
  const frames = new Map<number, () => void>();
  const deferFramesFromNowOn = () => {
    deferFrames = true;
  };
  const runFrames = () => {
    for (const [id, run] of frames) {
      frames.delete(id);
      run();
    }
  };
  const resizeTo = (height: number, scale = viewport.scale) => {
    viewport.height = height;
    viewport.scale = scale;
    target.dispatchEvent(new Event('resize'));
  };
  return {
    win: win as unknown as Window,
    resizeTo,
    deferFramesFromNowOn,
    runFrames,
  };
};

describe('startKeepingFocusedFieldInView', () => {
  it('scrolls the focused text field into view when the page shrinks', () => {
    const input = field('INPUT', 'text');
    const { win, resizeTo } = fakeWindow(input);
    startKeepingFocusedFieldInView(win);
    resizeTo(400);
    // Nearest, never by a keyboard height: the shell already made the room.
    expect(input.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
    });
  });

  it('leaves everything where it is when the page grows', () => {
    const input = field('INPUT', 'text');
    const { win, resizeTo } = fakeWindow(input);
    startKeepingFocusedFieldInView(win);
    resizeTo(900);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });

  it('ignores focus that is not text entry (a checkbox)', () => {
    const box = field('INPUT', 'checkbox');
    const { win, resizeTo } = fakeWindow(box);
    startKeepingFocusedFieldInView(win);
    resizeTo(400);
    expect(box.scrollIntoView).not.toHaveBeenCalled();
  });

  it('leaves a pinch zoom alone: the scale changed, so it is not a keyboard', () => {
    const input = field('INPUT', 'text');
    const { win, resizeTo } = fakeWindow(input);
    startKeepingFocusedFieldInView(win);
    resizeTo(600, 1.5);
    resizeTo(400, 2);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
    // At the new zoom, a keyboard coming up still brings the field into view.
    resizeTo(200, 2);
    expect(input.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrolls once, after the last of several shrinks within one frame', () => {
    const input = field('INPUT', 'text');
    const { win, resizeTo, deferFramesFromNowOn, runFrames } =
      fakeWindow(input);
    startKeepingFocusedFieldInView(win);
    deferFramesFromNowOn();
    // A keyboard animating up fires several resizes before the next frame.
    resizeTo(700);
    resizeTo(550);
    resizeTo(400);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
    runFrames();
    expect(input.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('stops listening once stopped', () => {
    const input = field('TEXTAREA');
    const { win, resizeTo } = fakeWindow(input);
    const stop = startKeepingFocusedFieldInView(win);
    stop();
    resizeTo(400);
    expect(input.scrollIntoView).not.toHaveBeenCalled();
  });

  it('does nothing where there is no visual viewport', () => {
    const win = { visualViewport: null } as unknown as Window;
    expect(() => startKeepingFocusedFieldInView(win)()).not.toThrow();
  });
});
