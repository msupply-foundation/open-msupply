import React, { FC } from 'react';
import {
  // useNotification,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  // useTableStore,
  AppBarContentPortal,
  SearchBar,
  FilterController,
} from '@openmsupply-client/common';
// import { canDeleteRequisition } from '../../utils';
import { RequestRequisitionRowFragment } from '../api';

export const Toolbar: FC<{
  onDelete: (toDelete: RequestRequisitionRowFragment[]) => void;
  filter: FilterController;
  data?: RequestRequisitionRowFragment[];
}> = ({ filter }) => {
  const t = useTranslation('replenishment');

  // const { success, info } = useNotification();

  // const { selectedRows } = useTableStore(state => ({
  //   selectedRows: Object.keys(state.rowState)
  //     .filter(id => state.rowState[id]?.isSelected)
  //     .map(selectedId => data?.find(({ id }) => selectedId === id))
  //     .filter(Boolean) as RequestRequisitionRowFragment[],
  // }));

  // const deleteAction = () => {
  //   const numberSelected = selectedRows.length;
  //   if (selectedRows && numberSelected > 0) {
  //     const canDeleteRows = selectedRows.every(canDeleteRequisition);
  //     if (!canDeleteRows) {
  //       const cannotDeleteSnack = info(t('messages.cant-delete-requisitions'));
  //       cannotDeleteSnack();
  //     } else {
  //       onDelete(selectedRows);
  //       const deletedMessage = t('messages.deleted-requisitions', {
  //         number: numberSelected,
  //       });
  //       const successSnack = success(deletedMessage);
  //       successSnack();
  //     }
  //   } else {
  //     const selectRowsSnack = info(t('messages.select-rows-to-delete'));
  //     selectRowsSnack();
  //   }
  // };

  // const ref = useRef(deleteAction);

  // useEffect(() => {
  //   ref.current = deleteAction;
  // }, [selectedRows]);

  const key = 'comment' as keyof RequestRequisitionRowFragment;
  const filterString = filter.filterBy?.[key]?.like as string;

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <SearchBar
        placeholder="Search by comment..."
        value={filterString}
        onChange={newValue => {
          if (!newValue) {
            return filter.onClearFilterRule('comment');
          }
          return filter.onChangeStringFilterRule('comment', 'like', newValue);
        }}
      />

      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={() => {}}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
