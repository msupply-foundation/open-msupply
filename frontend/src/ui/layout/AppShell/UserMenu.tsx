import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { UserIcon } from '../../icons';
import { t } from '../../../intl';
import { LabelledValue } from '../../elements/typography/LabelledValue';
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
  onLogout: () => void;
}

/*
 * Bottom-bar signed-in-user cell + menu (spec chrome › user menu / logout).
 * Shows the current username; opens a popup carrying the signed-in identity —
 * display name, username, email (OMS-REG-FTR-01.2/.3/.4) — whose one action is
 * logout. Same headless Kobalte DropdownMenu as LanguageSelector — it handles
 * focus return to the trigger on dismissal (OMS-REG-FTR-01.17 / D6). Opens
 * upward out of the footer.
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
        <div class={styles.heading}>{props.displayName}</div>
        <div class={styles.details}>
          <LabelledValue
            label={t('heading.username')}
            size="small"
            data-testid="user-popup-username"
          >
            {props.username}
          </LabelledValue>
          <LabelledValue
            label={t('label.email')}
            size="small"
            data-testid="user-popup-email"
          >
            {props.email ?? '-'}
          </LabelledValue>
        </div>
        <DropdownMenu.Item
          class={styles.item}
          data-testid="logout-button"
          onSelect={() => props.onLogout()}
        >
          {t('logout')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
