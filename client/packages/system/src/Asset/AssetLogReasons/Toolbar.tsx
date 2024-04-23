import React, { FC, useEffect, useRef, useState } from 'react';
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
  StatusType,
} from '@openmsupply-client/common';
import { useAssetData } from '../api';
import { getStatusOptions } from '../utils';

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
  const [deleteErrors, setDeleteErrors] = useState<DeleteError[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<AssetLogStatus | null>();
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as AssetLogReasonNode[],
  }));

  const onFilterChange = (option?: AssetLogStatus) => {
    if (!option) {
      filter.onClearFilterRule('assetLogStatus');
      setSelectedStatus(null);
      return;
    }
    filter.onChangeStringFilterRule('assetLogStatus', 'equalTo', option.value);
    setSelectedStatus(option);
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

  const options = getStatusOptions(t);
  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box
        display="flex"
        gap={2}
        sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}
      >
        <DropdownMenu
          label={selectedStatus?.label ?? t('placeholder.filter-by-status')}
        >
          {options.map(option => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => {
                onFilterChange(option);
              }}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => {
              onFilterChange();
            }}
          >
            {t('label.clear-filter')}
          </DropdownMenuItem>
        </DropdownMenu>
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
