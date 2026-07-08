import { createEffect, createSignal, onCleanup } from 'solid-js'
import { TextField } from '../../components/ui/TextField'
import { Button } from '../../components/ui/Button'
import { ArrowRightIcon, MSupplyGuyLogo } from '../../components/icons'
import { LanguageSelector } from '../../components/layout/AppShell/LanguageSelector'
import { isRtlLocale } from '../../components/layout/AppShell/languages'
import styles from './Login.module.css'

/*
 * The login page, recreated from the current app (host/src/components/Login):
 * gradient hero panel with the brand strapline on the left, form panel (logo,
 * username/password, log in) on the right. Layout, copy and colours follow
 * the original; the field and button are our library components rather than
 * ports of the MUI looks. Auth doesn't exist yet, so a valid submit walks
 * into the Home scaffold; the store-selector slide-over and the boxed error
 * panel are server-driven and land with the auth work.
 */
export const Login = () => {
  const [username, setUsername] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [language, setLanguage] = createSignal('en')

  const isValid = () => username().trim() !== '' && password() !== ''

  // Same document-level dir flip as AppShell (see DECISIONS.md 2026-07-08) —
  // login is where the language gets picked in the real app.
  createEffect(() => {
    document.documentElement.dir = isRtlLocale(language()) ? 'rtl' : 'ltr'
  })
  onCleanup(() => {
    document.documentElement.dir = 'ltr'
  })

  return (
    <div class={styles.page}>
      <section class={styles.hero} aria-label="About Open mSupply">
        <h1 class={styles.heroHeading}>
          {'Simple.\nPowerful.\nPharmaceutical\nManagement.'}
        </h1>
        <p class={styles.heroBody}>
          Welcome to Open mSupply. Your partner for managing health supply
          chains and improving medicine availability.
        </p>
      </section>

      <main class={styles.panel}>
        <div class={styles.formArea}>
          <form
            class={styles.form}
            aria-label="Log in"
            onSubmit={(event) => {
              event.preventDefault()
              if (isValid()) window.location.hash = '/home'
            }}
          >
            <MSupplyGuyLogo class={styles.logo} />
            <TextField
              label="Username"
              width="full"
              name="username"
              autocomplete="username"
              autofocus
              value={username()}
              onInput={(e) => setUsername(e.currentTarget.value)}
            />
            <TextField
              label="Password"
              width="full"
              type="password"
              name="password"
              autocomplete="current-password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
            />
            <div class={styles.buttonRow}>
              <Button
                type="submit"
                icon={<ArrowRightIcon />}
                iconPosition="end"
                disabled={!isValid()}
              >
                Log in
              </Button>
            </div>
          </form>
        </div>
        <footer class={styles.panelFooter}>
          {/* Placeholder until a build-time version constant exists. */}
          <p class={styles.version}>
            <strong>App version</strong> 0.0.0
          </p>
          <LanguageSelector language={language()} onSelect={setLanguage} />
        </footer>
      </main>
    </div>
  )
}
