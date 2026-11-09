import { Show } from 'solid-js';
import { t } from '../../../intl';
import { colourScheme, toggleColourScheme } from '../../styles/colourScheme';
import styles from './ThemeToggle.module.css';

/*
 * The icon-button form of the light/dark switch. The scheme itself — the
 * `data-theme` attribute, the persisted key, the shared signal — belongs to
 * styles/colourScheme, so this button and the Settings › Display switch always
 * agree. Components never know a theme exists: the [data-theme='dark'] token
 * override block in styles/tokens.css recolours everything via the cascade.
 */
export const ThemeToggle = () => {
  const theme = colourScheme;
  const toggle = toggleColourScheme;

  return (
    <button
      type="button"
      class={styles.toggle}
      onClick={toggle}
      aria-pressed={theme() === 'dark'}
      aria-label={t('button.dark-theme')}
      title={
        theme() === 'dark'
          ? t('button.switch-to-light-theme')
          : t('button.switch-to-dark-theme')
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
