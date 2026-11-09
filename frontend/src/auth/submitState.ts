import type { LoginResult } from './authContext';

// The submit state shared by the two login forms — the login page (S1) and the
// re-login modal (S4). Both drive it identically, so the mapping lives here
// once rather than being re-derived in each: a form that got it wrong locked
// its own fields forever.
export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

// Where a submitted form lands, given what login() answered.
//
// - A typed login error is the form's own to show, inline (spec, Login errors).
// - Anything else non-success is globally handled: the modal owns the
//   description, so the form adds no error — but it MUST stop claiming to be
//   submitting (spec, Unexpected API errors). Leaving it submitting disabled
//   the fields and the button behind "Logging in…" until a reload, and a reload
//   is what discards the credentials just typed. - Success is idle for the same
//   reason: no call is in flight. Nothing observes it — the authenticated user
//   unmounts both forms — but "submitting" would be a lie, and the caller
//   shouldn't have to special-case a state it never sees.
export const submitStateAfter = (result: LoginResult): SubmitState =>
  result.kind === 'error'
    ? { kind: 'error', message: result.message }
    : { kind: 'idle' };
