import { describe, expect, it } from 'vitest';
import { submitStateAfter } from './submitState';

/*
 * The shared login-form submit state (spec/startup rules § authentication and
 * § unexpected API errors; `OMS-REG-LGN-01.23`, `OMS-REG-LGN-05.11`).
 *
 * The load-bearing case is `pending`: both forms used to leave themselves
 * submitting on a globally-handled failure, so the fields and the button stayed
 * disabled behind "Logging in…" with no way out but a reload — which is exactly
 * what discards the credentials the user just typed. Nothing may be submitting
 * once the call has answered.
 */
describe('submitStateAfter', () => {
  it('is idle after a success — no call is in flight', () => {
    expect(submitStateAfter({ kind: 'success' })).toEqual({ kind: 'idle' });
  });

  it('carries a rejected login as the form its own inline error', () => {
    expect(
      submitStateAfter({
        kind: 'error',
        message: 'Invalid username or password',
      })
    ).toEqual({ kind: 'error', message: 'Invalid username or password' });
  });

  it('releases the submitting state on a globally-handled failure', () => {
    expect(submitStateAfter({ kind: 'pending' })).toEqual({ kind: 'idle' });
  });

  it('never stays submitting, whatever login answered', () => {
    const results = [
      { kind: 'success' },
      { kind: 'error', message: 'nope' },
      { kind: 'pending' },
    ] as const;
    for (const result of results) {
      expect(submitStateAfter(result).kind).not.toBe('submitting');
    }
  });

  it('adds no error of its own for a globally-handled failure', () => {
    // The modal owns the description; a second message here would duplicate it.
    expect(submitStateAfter({ kind: 'pending' }).kind).not.toBe('error');
  });
});
