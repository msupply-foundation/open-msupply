import { describe, expect, it } from 'vitest';
import { hasLoginFieldError, loginFieldErrors } from './loginFieldErrors';

/*
 * The login forms' required-field validation (spec/startup rules
 * § authentication and § initialisation; `OMS-REG-LGN-01.24` `.25`).
 *
 * THIS FE ONLY, by design — divergence D98: the current app disables its login
 * button until both fields are filled, so there is nothing to click and no
 * per-field message to assert. Here the button is always live and the click is
 * what validates, which is why this behaviour is asserted in a colocated test
 * rather than in the cross-FE e2e suite (e2e/AUTHORING.md § Divergences).
 * Copy is FE-owned, so the assertions are on which fields are flagged and
 * whether the submit is blocked — never on the message text.
 */
describe('loginFieldErrors', () => {
  it('flags both fields when the form is submitted empty', () => {
    const errors = loginFieldErrors('', '');
    expect(errors.username).not.toBe('');
    expect(errors.password).not.toBe('');
    expect(hasLoginFieldError(errors)).toBe(true);
  });

  it('flags only the field that is missing', () => {
    const noPassword = loginFieldErrors('Admin', '');
    expect(noPassword.username).toBe('');
    expect(noPassword.password).not.toBe('');

    const noUsername = loginFieldErrors('', 'pass');
    expect(noUsername.username).not.toBe('');
    expect(noUsername.password).toBe('');
  });

  it('treats a whitespace-only field as empty', () => {
    const errors = loginFieldErrors('   ', '\t');
    expect(errors.username).not.toBe('');
    expect(errors.password).not.toBe('');
  });

  it('lets a filled form through — nothing blocks the request', () => {
    const errors = loginFieldErrors('Admin', 'pass');
    expect(errors).toEqual({ username: '', password: '' });
    expect(hasLoginFieldError(errors)).toBe(false);
  });

  it('does not trim the credentials it validates — only the emptiness check ignores whitespace', () => {
    // A password may legitimately carry leading/trailing spaces; this helper
    // only decides whether a field is empty, it never rewrites what is sent.
    expect(hasLoginFieldError(loginFieldErrors(' Admin ', ' pass '))).toBe(
      false
    );
  });
});
