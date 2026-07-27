import { Dialog } from '../ui/elements/feedback/Dialog';
import {
  StoreSelector,
  type StoreOption,
} from '../ui/elements/selectors/StoreSelector';
import { useIsCompact } from '../ui/utils/createMediaQuery';
import { t } from '../intl';

// Spec (startup S3 / SL-6 / [D14]): the ONE store-selection surface, used
// identically for the login/bootstrap pick and the bottom-bar switch — the
// consistency the original routed-screen decision wanted, without replacing the
// app's content. A blocking in-place modal: dismissable=false, so there's no
// cancel (a store must be chosen — confirming the current one is how you leave
// the switch without changing), and scrimmed like any dialog so the app stays
// visible behind it. Offers "Remember my choice"; a full-screen sheet on
// compact/phone. `currentStoreId` highlights the active store first (switch).
export const StoreSelectionDialog = (props: {
  open: boolean;
  onClose: () => void;
  stores: StoreOption[];
  defaultStoreId?: string;
  lastUsedStoreId?: string;
  currentStoreId?: string;
  defaultRemember?: boolean;
  onSelect: (storeId: string, remember: boolean) => void;
}) => {
  const compact = useIsCompact();
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      dismissable={false}
      fullScreenOnCompact
      title={t('heading.select-store')}
    >
      <StoreSelector
        stores={props.stores}
        defaultStoreId={props.defaultStoreId}
        lastUsedStoreId={props.lastUsedStoreId}
        initialStoreId={props.currentStoreId}
        rememberOption
        defaultRemember={props.defaultRemember}
        fillHeight={compact()}
        onConfirm={props.onSelect}
      />
    </Dialog>
  );
};
