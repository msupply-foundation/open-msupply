import { createSignal, Show } from 'solid-js';
import { t } from '../../../intl';
import styles from './ThemeToggle.module.css';

const THEME_KEY = 'oms-theme';

/*
 * Flips `data-theme` on <html> and persists the choice. The pre-paint script
 * in index.html reads the same key so a dark user never sees a light flash.
 * Components never know a theme exists — the [data-theme='dark'] token
 * override block in styles/tokens.css recolours everything via the cascade.
 */
export const ThemeToggle = () => {
  const [theme, setTheme] = createSignal<'light' | 'dark'>(
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  );

  const toggle = () => {
    const next = theme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // storage unavailable (private mode) — theme still applies this session
    }
  };

  return (
    <button
      type="button"
      class={styles.toggle}
      onClick={toggle}
      aria-pressed={theme() === 'dark'}
      aria-label={t('theme.dark')}
      title={
        theme() === 'dark'
          ? t('theme.switch-to-light')
          : t('theme.switch-to-dark')
      }
    >
      <Show
        when={theme() === 'dark'}
        fallback={
          // sun
          <svg
            class={styles.icon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        }
      >
        {/* moon */}
        <svg
          class={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </Show>
    </button>
  );
};
