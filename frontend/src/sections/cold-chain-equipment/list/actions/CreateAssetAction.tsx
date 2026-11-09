import type { Component } from 'solid-js';
import { t } from '@/intl';
import { reportPermissionDenied } from '@/api/graphql';
import { hasPermission } from '@/store/storeContext';
import { Button } from '@/ui/elements/buttons/Button';
import { PlusCircleIcon } from '@/ui/icons';
import { ALT_N } from '@/ui/utils/shortcuts';

// The list's New asset action (ui-surface S1 § layout).
//
// Never disabled: creating needs ASSET_MUTATE, and a user without it is TOLD
// so rather than shown a dead control (rules › permissions, OMS-REG-CCE-05.25;
// ui-standards/controls § blocked affordances). The server enforces the same
// resource on the write regardless.
export const CreateAssetAction: Component<{ onOpen: () => void }> = props => {
  const onClick = () => {
    if (!hasPermission('ASSET_MUTATE')) {
      reportPermissionDenied(['AssetMutate']);
      return;
    }
    props.onOpen();
  };

  return (
    <Button
      variant="primary"
      icon={<PlusCircleIcon />}
      shortcut={ALT_N}
      data-testid="new-asset-button"
      onClick={onClick}
    >
      {t('button.new-asset')}
    </Button>
  );
};
