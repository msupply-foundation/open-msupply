import type { Component } from 'solid-js';
import { t } from '@/intl';
import { reportPermissionDenied } from '@/api/graphql';
import { hasPermission } from '@/store/storeContext';
import { Button } from '@/ui/elements/buttons/Button';
import { ImportIcon } from '@/ui/icons';

// The list's Import action (ui-surface S1 § layout). Its label reads _Import_,
// not "Upload assets" — that is the key's own text.
//
// Never disabled, for the same reason as create: a user without ASSET_MUTATE is
// told so rather than shown a dead control (OMS-REG-CCE-07.23).
export const ImportEquipmentAction: Component<{
  onOpen: () => void;
}> = props => {
  const onClick = () => {
    if (!hasPermission('ASSET_MUTATE')) {
      reportPermissionDenied(['AssetMutate']);
      return;
    }
    props.onOpen();
  };

  return (
    <Button
      variant="secondary"
      icon={<ImportIcon />}
      data-testid="import-equipment-button"
      onClick={onClick}
    >
      {t('button.upload-assets')}
    </Button>
  );
};
