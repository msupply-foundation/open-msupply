import React, { FC, memo, useEffect, useRef } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useNotification,
  useTableStore,
  useConfirmationModal,
  AlertModal,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocation } from '../api';

type DeleteError = {
  locationName: string;
  message: string;
};

export const FooterComponent: FC<{ data: LocationRowFragment[] }> = ({
  data,
}) => {
  const t = useTranslation();

  const { mutateAsync: deleteLocation } = useLocation.document.delete();
  const { error, success, info } = useNotification();
  const [deleteErrors, setDeleteErrors] = React.useState<DeleteError[]>([]);
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as LocationRowFragment[],
  }));

  const deleteAction = () => {
    const numberSelected = selectedRows.length;
    if (selectedRows && numberSelected > 0) {
      const errors: DeleteError[] = [];
      Promise.all(
        selectedRows.map(async location => {
          await deleteLocation(location).then(data => {
            if (data?.deleteLocation?.__typename === 'DeleteLocationError') {
              errors.push({
                locationName: location.name,
                message: data?.deleteLocation?.error?.description ?? '',
              });
            }
          });
        })
      )
        .then(() => {
          setDeleteErrors(errors);
          if (errors.length === 0) {
            const deletedMessage = t('messages.deleted-locations', {
              count: numberSelected,
            });
            const successSnack = success(deletedMessage);
            successSnack();
          }
        })
        .catch(_ =>
          error(
            t('messages.error-deleting-locations', { count: numberSelected })
          )()
        );
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  const showDeleteConfirmation = useConfirmationModal({
    onConfirm: deleteAction,
    message: t('messages.confirm-delete-locations', {
      count: selectedRows.length,
    }),
    title: t('heading.are-you-sure'),
  });

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
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
                {deleteErrors.map(({ locationName, message }) => (
                  <li key={locationName}>
                    {locationName}: {message}
                  </li>
                ))}
              </ul>
            }
            title={t('messages.error-deleting-locations', {
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
