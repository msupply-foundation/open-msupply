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
} from '@openmsupply-client/common';
import { useLocationDelete } from './api';
import { Location } from '../types';

type DeleteError = {
  locationName: string;
  message: string;
};

export const Toolbar: FC<{
  data: Location[];
  filter: FilterController;
}> = ({ data }) => {
  const t = useTranslation('inventory');
  const { mutateAsync: deleteLocation } = useLocationDelete();
  const { success, info } = useNotification();
  const [deleteErrors, setDeleteErrors] = React.useState<DeleteError[]>([]);
  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as Location[],
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
      ).then(() => {
        setDeleteErrors(errors);
        if (errors.length === 0) {
          const deletedMessage = t('messages.deleted-locations', {
            number: numberSelected,
          });
          const successSnack = success(deletedMessage);
          successSnack();
        }
      });
    } else {
      const selectRowsSnack = info(t('messages.select-rows-to-delete'));
      selectRowsSnack();
    }
  };

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
  }, [selectedRows]);

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'flex-end',
        display: 'flex',
      }}
    >
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

      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
