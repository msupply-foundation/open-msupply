import { Show, type Component } from 'solid-js';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { Button } from '../ui/elements/buttons/Button';
import { StoreSelector } from '../ui/elements/selectors/StoreSelector';
import { EditIcon } from '../ui/icons';
import { createStorePicker } from './storePicker';
import { currentStoreId } from './storeContext';
import { t } from '../intl';

// Spec (startup S3 › store switch, SL-6, [D14]): the store-selection panel's
// MODAL host — opened by the bottom-bar store selector, over the current
// screen, with the URL and entered store unchanged while it is open
// (OMS-REG-LGN-02.11). Dismissable (Escape / scrim / the close affordance):
// dismissing changes nothing (.29), and the native <dialog> returns focus to
// the trigger (.30). Confirming a store closes it and navigates to
// /{store-id}, re-running Guards 2 and 3.
//
// The Dialog heading carries the panel's title, so the selector's own is
// hidden; the host mounts this fresh per open (ShellLayout), so the panel's
// search/checkbox state never leaks between opens.
//
// This is the only host with a store to call CURRENT (OMS-REG-LGN-02.35): at
// sign-in none is entered yet. Passing it marks the row the user is standing
// in and suppresses its Last-used chip — entering a store records it as the
// previous one (SL-4), so without this the current store always carries a
// marker pointing at where the user already is.
export const StoreSwitchModal: Component<{
  open: boolean;
  onClose: () => void;
  /**
   * Open the store editor for the store the app is currently in (spec/settings
   * OMS-REG-SET-05.17/.18). This is where editing a store now lives — it left
   * the bottom bar in issue #9229, because a standing Edit cell there said
   * nothing about WHAT it edits, while here the store it acts on is the subject
   * of the whole panel. Absent → no Edit action (a host with no editor to open,
   * e.g. the login flow's picker, gets none rather than a dead button).
   *
   * It rides the dialog HEADER rather than a row inside the list: the list is a
   * `role="listbox"`, whose children must be options — a second button inside a
   * row would be unreachable to assistive tech.
   */
  onEditStore?: () => void;
}> = props => {
  const picker = createStorePicker();
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('heading.select-store')}
      headerActions={
        <Show when={props.onEditStore}>
          <Button
            variant="secondary"
            size="small"
            icon={<EditIcon />}
            onClick={() => props.onEditStore?.()}
            data-testid="store-edit-current"
          >
            {t('button.edit-current-store')}
          </Button>
        </Show>
      }
      closeButton
      testId="store-switch-modal"
    >
      <StoreSelector
        stores={picker.stores()}
        defaultStoreId={picker.defaultStoreId()}
        lastUsedStoreId={picker.lastUsedStoreId()}
        currentStoreId={currentStoreId()}
        pinnedCount={picker.pinnedCount()}
        defaultAlwaysOpen={picker.alwaysOpenSaved()}
        onAlwaysOpenChange={picker.alwaysOpenChanged}
        hideTitle
        onConfirm={(storeId, alwaysOpen) => {
          picker.confirm(storeId, alwaysOpen);
          props.onClose();
        }}
      />
    </Dialog>
  );
};
