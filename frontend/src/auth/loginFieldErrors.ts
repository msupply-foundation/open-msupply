import { t } from '../intl';

// Required-field validation for the two login forms — the login page (S1) and
// the re-login modal (S4). Shared for the same reason as submitState: both run
// the identical check, and a form that drifted from it would either submit an
// empty credential pair or refuse a filled one.
export interface LoginFieldErrors {
  username: string;
  password: string;
}

// Spec (rules § authentication, `OMS-REG-LGN-01.24` `.25`; D98): the submit
// button is never disabled for an empty field — the click is what validates,
// and each empty field answers with its own message rather than the form going
// quiet. Whitespace is not a credential, so a space-only field is empty.
export const loginFieldErrors = (
  username: string,
  password: string
): LoginFieldErrors => ({
  username: username.trim() === '' ? t('error.username-required') : '',
  password: password.trim() === '' ? t('error.password-required') : '',
});

// Whether that validation blocks the submit — no request leaves the client
// while any required field is flagged (`OMS-REG-LGN-01.25`).
export const hasLoginFieldError = (errors: LoginFieldErrors): boolean =>
  errors.username !== '' || errors.password !== '';
