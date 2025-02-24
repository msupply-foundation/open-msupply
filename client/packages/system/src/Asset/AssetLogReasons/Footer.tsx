import React, { FC, memo, useEffect, useRef, useState } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useNotification,
  useTableStore,
  useConfirmationModal,
  AssetLogReasonNode,
  AlertModal,
} from '@openmsupply-client/common';
import { useAssetData } from '../api';

type DeleteError = {
  reason: string;
  message: string;
};

export const FooterComponent: FC<{ data: AssetLogReasonNode[] }> = ({
  data,
}) => {
  const t = useTranslation();

  const { mutateAsync: deleteReason } = useAssetData.log.deleteReason();
  const { error, success, info } = useNotification();
  const [deleteErrors, setDeleteErrors] = useState<DeleteError[]>([]);

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as AssetLogReasonNode[],
  }));
  const { clearSelected } = useTableStore();

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
            clearSelected();
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

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: showDeleteConfirmation,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
            />
          )}
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
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
