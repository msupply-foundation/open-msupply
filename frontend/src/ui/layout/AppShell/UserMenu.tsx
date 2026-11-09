import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { Show } from 'solid-js';
import { MailIcon, PowerIcon, UserIcon } from '../../icons';
import { t } from '../../../intl';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  /**
   * The signed-in user's login name, shown in the bottom bar and in the
   * popup's username row (OMS-REG-FTR-01.3).
   */
  username: string;
  /**
   * The user's full display name — first + last name, falling back to the
   * username when the record carries neither. Heads the popup
   * (OMS-REG-FTR-01.2).
   */
  displayName: string;
  /**
   * The user's recorded email address (OMS-REG-FTR-01.4). Nullable on the user
   * record; a dash stands in when none is recorded, same as the current app.
   */
  email?: string | null;
  /**
   * The user's recorded job title, the subtitle under the display name — as in
   * the current app's popup. Nullable on the user record; the subtitle is
   * simply absent when none is recorded (nothing to label).
   */
  jobTitle?: string | null;
  onLogout: () => void;
}

/*
 * The avatar's initials: the first character of the first two words of the
 * display name (which falls back to the username, so this is never empty for a
 * signed-in user). Spread rather than charAt so a surrogate pair (emoji, some
 * scripts) isn't split down the middle. Decorative — the name it abbreviates
 * sits right beside it, so the avatar is aria-hidden.
 */
const initials = (displayName: string): string =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => [...word][0] ?? '')
    .join('')
    .toLocaleUpperCase();

/*
 * Bottom-bar signed-in-user cell + menu (spec chrome › user menu / logout).
 * Shows the current username; opens a popup carrying the signed-in identity —
 * display name, username, email (OMS-REG-FTR-01.2/.3/.4) — whose one action is
 * logout. Same headless Kobalte DropdownMenu as LanguageSelector — it handles
 * focus return to the trigger on dismissal (OMS-REG-FTR-01.17 / D6). Opens
 * upward out of the footer.
 *
 * Layout is the identity-card form: an initials avatar + name/job-title header,
 * the contact facts in a recessed block below it, and logout as the sole menu
 * item behind a full-bleed hairline. The identity is static text, so it is
 * wrapped in a `Group` labelled by the display name rather than left loose
 * inside the `menu` role, where a screen reader would announce it poorly. Each
 * contact row leads with an icon and carries its field name as a visually
 * hidden label — the row still reads "Email: …" to assistive tech, and the
 * label still translates, without spending a line of the popup on it.
 */
export const UserMenu = (props: UserMenuProps) => (
  <DropdownMenu.Root placement="top-start" gutter={8}>
    <DropdownMenu.Trigger
      class={styles.trigger}
      data-testid="user-menu-trigger"
      title={props.username}
    >
      <UserIcon class={styles.icon} />
      <span class={styles.triggerText}>{props.username}</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content} data-testid="user-popup">
        <DropdownMenu.Group>
          <div class={styles.header}>
            <span class={styles.avatar} aria-hidden="true">
              {initials(props.displayName)}
            </span>
            <div class={styles.names}>
              <DropdownMenu.GroupLabel class={styles.name}>
                {props.displayName}
              </DropdownMenu.GroupLabel>
              <Show when={props.jobTitle}>
                <span class={styles.jobTitle}>{props.jobTitle}</span>
              </Show>
            </div>
          </div>
          <div class={styles.details}>
            <div class={styles.row} data-testid="user-popup-username">
              <UserIcon class={styles.rowIcon} />
              <span class={styles.rowLabel}>{t('heading.username')}</span>
              <span class={styles.rowValue} title={props.username}>
                {props.username}
              </span>
            </div>
            <div class={styles.row} data-testid="user-popup-email">
              <MailIcon class={styles.rowIcon} />
              <span class={styles.rowLabel}>{t('label.email')}</span>
              <span class={styles.rowValue} title={props.email ?? undefined}>
                {props.email ?? '-'}
              </span>
            </div>
          </div>
        </DropdownMenu.Group>
        <div class={styles.actions}>
          <DropdownMenu.Item
            class={styles.item}
            data-testid="logout-button"
            onSelect={() => props.onLogout()}
          >
            <PowerIcon class={styles.itemIcon} />
            {t('logout')}
          </DropdownMenu.Item>
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
