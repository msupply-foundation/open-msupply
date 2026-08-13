import { createSignal, onMount, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { login } from './authContext';
import { submitStateAfter, type SubmitState } from './submitState';
import { hasLoginFieldError, loginFieldErrors } from './loginFieldErrors';
import { getLastLoginUsername } from '../appData';
import { serverVersion } from '../api/serverInfo';
import { createFocusTarget } from '../ui/utils/createFocusTarget';
import { useIsCompact } from '../ui/utils/createMediaQuery';
import { TextField } from '../ui/elements/inputs/TextField';
import { PasswordField } from '../ui/elements/inputs/PasswordField';
import { Button } from '../ui/elements/buttons/Button';
import { Alert } from '../ui/elements/feedback/Alert';
import { ArrowRightIcon, ClockIcon } from '../ui/icons';
import { AppLogo } from '../ui/branding/AppLogo';
import { LanguageSelector } from '../ui/layout/AppShell/LanguageSelector';
import { changeLanguage, locale, t } from '../intl';
import styles from '../ui/styles/LoginInitLayout.module.css';

// The login screen: the design-system Login (gradient hero + form panel,
// recreated from the current app — see kdd/page-composition) composed with
// the real auth flow (login()). The form controls are the library TextField /
// Button; the submit failure surfaces in the library Alert; the footer language
// selector drives real i18n. Success needs no callback — login() sets the user
// signal and the app (App.tsx) reacts, continuing to the preserved destination
// URL (spec, Startup Flow). Document dir/lang is owned once by App.tsx.
export const LoginPage: Component = () => {
  // Spec (Authentication): prefilled from the device's remembered username, so
  // the returning user only retypes the password. Read once as the signal's
  // initial value — the page is remounted whenever authUser() clears, so it
  // re-reads on every return to it, and nothing here needs to be reactive.
  const remembered = getLastLoginUsername();
  const [username, setUsername] = createSignal(remembered ?? '');
  const [password, setPassword] = createSignal('');
  // Spec (S1): focus starts on whichever field still needs typing — the
  // username when nothing is remembered, the password when the name is already
  // filled in.
  //
  // Handles rather than native `autofocus` (kdd/focus-targets), because this
  // page mounts a SECOND time: a logout clears authUser() and App.tsx swaps it
  // back in, in the same document. Native `autofocus` is honoured at most once
  // per document — the first mount sets the browser's autofocus-processed flag,
  // and every later one is ignored — so the attribute would silently do nothing
  // on exactly the path this exists for (log in, log out, come back to a
  // remembered name with only the password left to type). Verified in Chrome: a
  // remount's `autofocus` leaves focus on <body>.
  const usernameField = createFocusTarget();
  const passwordField = createFocusTarget();
  onMount(() =>
    (remembered === undefined ? usernameField : passwordField).focus()
  );
  const [fieldErrors, setFieldErrors] = createSignal({
    username: '',
    password: '',
  });
  const [submitState, setSubmitState] = createSignal<SubmitState>({
    kind: 'idle',
  });

  // Only decides WHERE the version line renders — see versionLine() below.
  const compact = useIsCompact();

  const submitting = () => submitState().kind === 'submitting';
  const submitError = () => {
    const state = submitState();
    return state.kind === 'error' ? state.message : undefined;
  };

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    // Spec (rules § authentication, `OMS-REG-LGN-01.24` `.25`): the button is
    // always clickable — the click is what validates, and each empty field
    // answers with its own message. A deliberate divergence from the current
    // app's disabled-until-filled button (D98), ruled to stand (#762).
    const errors = loginFieldErrors(username(), password());
    setFieldErrors(errors);
    if (hasLoginFieldError(errors)) return;
    setSubmitState({ kind: 'submitting' });
    const result = await login(username(), password());
    // Clear the password only on a rejected login (finding F6 — align with the
    // current app; a wrong password is re-entered, not left in the field). A
    // globally-handled failure reached no verdict on it, so it stays and the
    // same submit can simply be repeated.
    if (result.kind === 'error') setPassword('');
    setSubmitState(submitStateAfter(result));
  };

  // Spec (App version, OMS-REG-LGN-01.18/.20): the running build's version and
  // — once the startup pass has fetched it, never as a placeholder — the
  // server's, on one line at the bottom of the page's left half.
  //
  // ONE element, rendered either in the hero or, below the compact breakpoint
  // where the hero doesn't render at all, in the panel. Never both, so
  // `login-version` stays a single match; a CSS-only move is impossible
  // because a child of the hidden hero is hidden with it (CLAUDE.md #7 — a
  // breakpoint decides which element renders).
  const versionLine = (placement: string) => (
    <p class={`${styles.versionBar} ${placement}`} data-testid="login-version">
      <span>
        <strong>{t('label.version-interface')}</strong> {APP_VERSION}
      </span>
      <Show when={serverVersion()}>
        <span>
          <strong>{t('label.version-server')}</strong> {serverVersion()}
        </span>
      </Show>
    </p>
  );

  return (
    <div class={styles.page}>
      <section class={styles.hero} aria-label={t('label.about-open-msupply')}>
        <h1 class={styles.heroHeading}>{t('login.heading')}</h1>
        <p class={styles.heroBody}>{t('login.body')}</p>
        <Show when={!compact()}>{versionLine(styles.versionBarHero)}</Show>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          <form
            class={`${styles.form} ${styles.loginForm}`}
            aria-labelledby="login-heading"
            onSubmit={submit}
          >
            {/* The form's heading, and its accessible name via aria-labelledby
                — the login form had no heading of its own before, so nothing
                named this landmark's content to a screen reader. Not displayed:
                the logo below and the hero's statement already carry the page's
                visible identity. h2, not h1, because the hero's brand statement
                is the page's h1 and this is the top of a region within it — a
                plain element rather than the Text primitive, since an invisible
                heading has no type style to set. First in the form so it is
                read before the fields it names. */}
            <h2 id="login-heading" class={styles.srOnly}>
              {t('login.form-heading')}
            </h2>
            <AppLogo class={styles.logo} />
            <TextField
              label={t('heading.username')}
              type="text"
              name="username"
              data-testid="login-username-input"
              autocomplete="username"
              ref={usernameField.ref}
              value={username()}
              error={fieldErrors().username || undefined}
              onInput={e => setUsername(e.currentTarget.value)}
              // Spec (issue #519.6): lock the fields once login is in flight so
              // the credentials being verified can't be edited mid-request.
              disabled={submitting()}
            />
            <PasswordField
              label={t('heading.password')}
              name="password"
              data-testid="login-password-input"
              autocomplete="current-password"
              ref={passwordField.ref}
              value={password()}
              error={fieldErrors().password || undefined}
              onInput={e => setPassword(e.currentTarget.value)}
              disabled={submitting()}
            />
            <Show when={submitError()}>
              <Alert severity="error" testId="login-error">
                {submitError()}
              </Alert>
            </Show>
            {/* The primary action spans the form column, with both secondary
                controls directly beneath it rather than in a page footer —
                they belong to the login decision, not to the page. */}
            <div class={styles.submitGroup}>
              <Button
                type="submit"
                class={styles.submitButton}
                icon={<ArrowRightIcon />}
                iconPosition="end"
                data-testid="login-button"
                disabled={submitting()}
              >
                {submitting() ? t('button.logging-in') : t('button.login')}
              </Button>
              <div class={styles.loginActions}>
                {/* Sibling old UI, served at the server root /old-ui/
                    (dual-frontend transition — one cookie session spans both).
                    A plain anchor for a full document navigation, NOT router
                    navigation: it's a different app. The href is root-relative
                    on purpose — /old-ui/ is a sibling of this app's BASE_URL
                    mount, never nested under it (e.g. the /spec demo track
                    still points at the root /old-ui/). Shaped like the language
                    trigger opposite it, but still a link — see
                    `.secondaryAction`. */}
                <a
                  class={styles.secondaryAction}
                  href="/old-ui/"
                  data-testid="login-switch-to-old-ui"
                >
                  <ClockIcon class={styles.secondaryActionIcon} />
                  {t('login.use-old-interface')}
                </a>
                <div class={styles.languageAction}>
                  <LanguageSelector
                    language={locale()}
                    onSelect={v => void changeLanguage(v)}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <Show when={compact()}>{versionLine(styles.versionBarPanel)}</Show>
      </main>
    </div>
  );
};
