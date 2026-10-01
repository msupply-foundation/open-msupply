import { createRoot, createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFooterReport,
  MESSAGE_FLASH_MS,
  type FooterMessage,
} from './footerReport';

/*
 * The timing behind the content footer's message slot (issue #607):
 * ContentFooterMessage renders `shown`, marks the chip `leaving`, and calls
 * `exited()` when the chip's exit animation ends. A .tsx suite so it runs in
 * the `solid` vitest project, whose browser resolve conditions make signals
 * track (vitest.workspace.ts).
 */
const setup = () =>
  createRoot(dispose => {
    const [message, setMessage] = createSignal<FooterMessage>();
    const report = createFooterReport(message);
    return { report, setMessage, dispose };
  });

const saved = (): FooterMessage => ({ type: 'success', text: 'Saved' });
const refused = (): FooterMessage => ({
  type: 'error',
  text: 'Cannot receive with no lines',
  persistent: true,
});

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createFooterReport', () => {
  it('shows nothing at rest', () => {
    const { report, dispose } = setup();
    expect(report.shown()).toBeUndefined();
    expect(report.leaving()).toBe(false);
    dispose();
  });

  it('shows a success at once and ends it after MESSAGE_FLASH_MS', () => {
    const { report, setMessage, dispose } = setup();
    const message = saved();
    setMessage(message);
    expect(report.shown()).toBe(message);
    vi.advanceTimersByTime(MESSAGE_FLASH_MS - 1);
    expect(report.leaving()).toBe(false);
    vi.advanceTimersByTime(1);
    // Ended, but still on screen until its exit has played.
    expect(report.leaving()).toBe(true);
    expect(report.shown()).toBe(message);
    report.exited();
    expect(report.shown()).toBeUndefined();
    expect(report.leaving()).toBe(false);
    dispose();
  });

  it('keeps a persistent message until the caller clears it', () => {
    const { report, setMessage, dispose } = setup();
    setMessage(refused());
    vi.advanceTimersByTime(MESSAGE_FLASH_MS * 3);
    expect(report.leaving()).toBe(false);
    setMessage(undefined);
    expect(report.leaving()).toBe(true);
    report.exited();
    expect(report.shown()).toBeUndefined();
    dispose();
  });

  it('ignores exited() while the chip is not leaving', () => {
    // The chip's ENTRANCE ends in an animationend too.
    const { report, setMessage, dispose } = setup();
    const message = saved();
    setMessage(message);
    report.exited();
    expect(report.shown()).toBe(message);
    dispose();
  });

  it('replaces a chip mid-exit with the next report at once', () => {
    const { report, setMessage, dispose } = setup();
    setMessage(refused());
    setMessage(undefined);
    expect(report.leaving()).toBe(true);
    const next = saved();
    setMessage(next);
    expect(report.shown()).toBe(next);
    expect(report.leaving()).toBe(false);
    dispose();
  });

  it('restarts the timer for each new report', () => {
    const { report, setMessage, dispose } = setup();
    setMessage(saved());
    vi.advanceTimersByTime(MESSAGE_FLASH_MS - 1000);
    // A second "Saved" — a new object, so a new report.
    setMessage(saved());
    vi.advanceTimersByTime(1000);
    expect(report.leaving()).toBe(false);
    vi.advanceTimersByTime(MESSAGE_FLASH_MS - 1000);
    expect(report.leaving()).toBe(true);
    dispose();
  });

  it('does not let a success timer end the refusal that replaced it', () => {
    const { report, setMessage, dispose } = setup();
    setMessage(saved());
    setMessage(refused());
    vi.advanceTimersByTime(MESSAGE_FLASH_MS);
    expect(report.leaving()).toBe(false);
    dispose();
  });

  it('does nothing when cleared after the chip already went', () => {
    // A footer clears its message at the next attempt, long after the last
    // success cleared itself off the screen.
    const { report, setMessage, dispose } = setup();
    setMessage(saved());
    vi.advanceTimersByTime(MESSAGE_FLASH_MS);
    report.exited();
    setMessage(undefined);
    expect(report.shown()).toBeUndefined();
    expect(report.leaving()).toBe(false);
    dispose();
  });

  it('cancels the pending self-clear on unmount', () => {
    const { setMessage, dispose } = setup();
    setMessage(saved());
    expect(vi.getTimerCount()).toBe(1);
    dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
