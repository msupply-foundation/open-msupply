import { createSignal, Show } from 'solid-js';
import type { Component } from 'solid-js';
import { t } from '@/intl';
import { reportPermissionDenied } from '@/api/graphql';
import { hasPermission } from '@/store/storeContext';
import { Button } from '@/ui/elements/buttons/Button';
import { SplitButton } from '@/ui/elements/buttons/SplitButton';
import { PlusCircleIcon } from '@/ui/icons';
import { UpdateStatusModal } from './UpdateStatusModal';
import { TemperatureMappingModal } from './TemperatureMappingModal';

// The detail screen's status action (ui-surface S2 § page actions).
//
// A cold room or freezer room ALSO records temperature mappings, so it gets a
// split button whose main action is Update status and whose second option is
// Temperature mapping (AC-M1). Every other asset gets the plain button — a
// mapping is not something it records (AC-M2).
//
// Recording a status needs ASSET_MUTATE **or** ASSET_STATUS_MUTATE. The second
// is a client-side concept: `insertAssetLog` itself asks only for the first, so
// a user holding only ASSET_STATUS_MUTATE is offered the dialog and then
// refused by the server — captured as-is from the reference app (contract ›
// permissions).

type Action = 'update-status' | 'record-mapping';

export interface StatusActionsProps {
  storeId: string;
  assetId: string;
  isColdRoom: boolean;
  onRecorded: () => void;
}

export const StatusActions: Component<StatusActionsProps> = props => {
  const [open, setOpen] = createSignal<Action | null>(null);

  const permitted = () =>
    hasPermission('ASSET_MUTATE') || hasPermission('ASSET_STATUS_MUTATE');

  const trigger = (action: Action) => {
    // Told, not shown a dead control (AC-G3).
    if (!permitted()) {
      reportPermissionDenied(['AssetMutate', 'AssetStatusMutate']);
      return;
    }
    setOpen(action);
  };

  return (
    <>
      <Show
        when={props.isColdRoom}
        fallback={
          <Button
            variant="primary"
            icon={<PlusCircleIcon />}
            data-testid="update-status-button"
            onClick={() => trigger('update-status')}
          >
            {t('button.update-status')}
          </Button>
        }
      >
        <SplitButton
          variant="primary"
          icon={<PlusCircleIcon />}
          testId="status-split-button"
          defaultValue="update-status"
          options={[
            { value: 'update-status', label: t('button.update-status') },
            { value: 'record-mapping', label: t('label.temperature-mapping') },
          ]}
          onAction={value => trigger(value as Action)}
        />
      </Show>

      <Show when={open() === 'update-status'}>
        <UpdateStatusModal
          storeId={props.storeId}
          assetId={props.assetId}
          onClose={() => setOpen(null)}
          onRecorded={props.onRecorded}
        />
      </Show>
      <Show when={open() === 'record-mapping'}>
        <TemperatureMappingModal
          storeId={props.storeId}
          assetId={props.assetId}
          onClose={() => setOpen(null)}
          onRecorded={props.onRecorded}
        />
      </Show>
    </>
  );
};
