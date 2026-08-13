import type { Component } from 'solid-js';
import { Dialog } from '../ui/elements/feedback/Dialog';
import { StoreSelector } from '../ui/elements/selectors/StoreSelector';
import { createStorePicker } from './storePicker';
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
export const StoreSwitchModal: Component<{
  open: boolean;
  onClose: () => void;
}> = props => {
  const picker = createStorePicker();
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={t('heading.select-store')}
      closeButton
      testId="store-switch-modal"
    >
      <StoreSelector
        stores={picker.stores()}
        defaultStoreId={picker.defaultStoreId()}
        lastUsedStoreId={picker.lastUsedStoreId()}
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
