import React, { FC, useEffect, useRef } from 'react';
import {
  useNotification,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  useTableStore,
  AppBarContentPortal,
  FilterController,
  AlertModal,
  useConfirmationModal,
  FilterMenu,
  Box,
} from '@openmsupply-client/common';
import { LocationRowFragment, useLocation } from '../api';

type DeleteError = {
  locationName: string;
  message: string;
};

export const Toolbar: FC<{
  data: LocationRowFragment[];
  filter: FilterController;
}> = ({ data }) => {
  const t = useTranslation('inventory');
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

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <Box display="flex" gap={1}>
        <FilterMenu
          filters={[
            {
              type: 'text',
              name: t('label.name'),
              urlParameter: 'name',
            },
            {
              type: 'boolean',
              name: t('label.on-hold'),
              urlParameter: 'onHold',
            },
          ]}
        />
      </Box>
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
