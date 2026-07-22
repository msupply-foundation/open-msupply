import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { UserIcon } from '../../icons';
import { t } from '../../../intl';
import styles from './UserMenu.module.css';

interface UserMenuProps {
  /**
   * The signed-in user's name, shown in the bottom bar (spec: signed-in user).
   */
  username: string;
  onLogout: () => void;
}

/*
 * Bottom-bar signed-in-user cell + menu (spec chrome › user menu / logout).
 * Shows the current username; opens a menu whose one action is logout. Same
 * headless Kobalte DropdownMenu as LanguageSelector — it handles focus return
 * to the trigger on dismissal (AC-CH6 / D6). Opens upward out of the footer.
 */
export const UserMenu = (props: UserMenuProps) => (
  <DropdownMenu.Root placement="top-start" gutter={8}>
    <DropdownMenu.Trigger class={styles.trigger} title={props.username}>
      <UserIcon class={styles.icon} />
      <span class={styles.triggerText}>{props.username}</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content}>
        <div class={styles.heading}>{props.username}</div>
        <DropdownMenu.Item
          class={styles.item}
          onSelect={() => props.onLogout()}
        >
          {t('logout')}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
