import React, { FC, useEffect, useRef } from 'react';
import {
  useNotification,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  useTableStore,
  AppBarContentPortal,
  AlertModal,
  useConfirmationModal,
  Box,
  AssetLogReasonNode,
  FilterController,
  AutocompleteOnChange,
  InputLabel,
  Autocomplete,
  StatusType,
} from '@openmsupply-client/common';
import { useAssetData } from '../api';

type DeleteError = {
  reason: string;
  message: string;
};

export type AssetLogStatus = {
  label: string;
  value: StatusType;
};

export const Toolbar: FC<{
  data: AssetLogReasonNode[];
  filter: FilterController;
}> = ({ data, filter }) => {
  const t = useTranslation(['catalogue', 'coldchain']);

  const { mutateAsync: deleteReason } = useAssetData.log.deleteReason();
  const { error, success, info } = useNotification();
  const [deleteErrors, setDeleteErrors] = React.useState<DeleteError[]>([]);
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as AssetLogReasonNode[],
  }));

  const onFilterChange: AutocompleteOnChange<AssetLogStatus> = (_, option) => {
    if (!option) {
      filter.onClearFilterRule('assetLogStatus');
      return;
    }
    filter.onChangeStringFilterRule('assetLogStatus', 'equalTo', option.value);
  };

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const errors: DeleteError[] = [];
      Promise.all(
        selectedRows.map(async reason => {
          await deleteReason(reason.id).then(data => {
            if (
              data?.deleteLogReason.__typename === 'DeleteAssetLogReasonError'
            ) {
              errors.push({
                reason: reason.reason,
                message: data?.deleteLogReason?.error?.description ?? '',
              });
            }
          });
        })
      )
        .then(() => {
          setDeleteErrors(errors);
          if (errors.length === 0) {
            const deletedMessage = t('messages.deleted-reasons', {
              count: numberSelected,
            });
            const successSnack = success(deletedMessage);
            successSnack();
          }
        })
        .catch(_ =>
          error(
            t('messages.error-deleting-reasons', { count: numberSelected })
          )()
        );
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  const showDeleteConfirmation = useConfirmationModal({
    onConfirm: deleteAction,
    message: t('messages.confirm-delete-reasons', {
      count: selectedRows.length,
    }),
    title: t('heading.are-you-sure'),
  });

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRows]);

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <InputLabel>{t('placeholder.filter-by-status')}</InputLabel>
        <Autocomplete
          isOptionEqualToValue={(option, value) => option.value === value.value}
          width="150px"
          popperMinWidth={150}
          options={[
            {
              label: t('status.decommissioned', { ns: 'coldchain' }),
              value: StatusType.Decommissioned,
            },
            {
              label: t('status.functioning', { ns: 'coldchain' }),
              value: StatusType.Functioning,
            },
            {
              label: t('status.functioning-but-needs-attention', {
                ns: 'coldchain',
              }),
              value: StatusType.FunctioningButNeedsAttention,
            },
            {
              label: t('status.not-functioning', { ns: 'coldchain' }),
              value: StatusType.NotFunctioning,
            },
            {
              label: t('status.not-in-use', { ns: 'coldchain' }),
              value: StatusType.NotInUse,
            },
          ]}
          onChange={onFilterChange}
        />
      </Box>
      <AlertModal
        message={
          <ul>
            {deleteErrors.map(({ reason, message }) => (
              <li key={reason}>
                {reason}: {message}
              </li>
            ))}
          </ul>
        }
        title={t('messages.error-deleting-reasons', {
          count: deleteErrors.length,
        })}
        open={deleteErrors.length > 0}
        onOk={() => setDeleteErrors([])}
      />

      <DropdownMenu label={t('label.actions')}>
        <DropdownMenuItem
          IconComponent={DeleteIcon}
          onClick={() => showDeleteConfirmation()}
        >
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
