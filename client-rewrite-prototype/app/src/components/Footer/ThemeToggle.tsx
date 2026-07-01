import { SunIcon, MoonIcon } from '@/components/icons';
import { useTheme } from '@/theme/themeContext';
import styles from './Footer.module.css';

/*
 * Footer light/dark toggle. Reuses the footer's .cell/.icon classes like
 * LanguageSelector. Shows the icon of the mode you'll switch TO (a moon while
 * light, a sun while dark) — the conventional toggle affordance.
 */
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <button
      type="button"
      className={styles.cell}
      onClick={toggleTheme}
      title={label}
      aria-label={label}
    >
      {isDark ? (
        <SunIcon className={styles.icon} />
      ) : (
        <MoonIcon className={styles.icon} />
      )}
    </button>
  );
};
