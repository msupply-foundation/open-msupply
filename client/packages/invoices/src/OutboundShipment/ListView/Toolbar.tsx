import React, { FC, useEffect, useRef } from 'react';
import {
  useNotification,
  DropdownMenu,
  DropdownMenuItem,
  useTranslation,
  DeleteIcon,
  useTableStore,
  AppBarContentPortal,
  InputWithLabelRow,
  BasicTextInput,
  FilterController,
} from '@openmsupply-client/common';
import { InvoiceRow } from '../../types';

export const Toolbar: FC<{
  onDelete: (toDelete: InvoiceRow[]) => void;
  filter: FilterController<InvoiceRow>;
  data?: InvoiceRow[];
}> = ({ onDelete, data, filter }) => {
  const t = useTranslation('outbound-shipment');

  const { success, info } = useNotification();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => data?.find(({ id }) => selectedId === id))
      .filter(Boolean) as InvoiceRow[],
  }));

  const deleteAction = () => {
    if (selectedRows && selectedRows?.length > 0) {
      onDelete(selectedRows);
      success(`Deleted ${selectedRows?.length} invoices`)();
    } else {
      info('Select rows to delete them')();
    }
  };

  const ref = useRef(deleteAction);

  useEffect(() => {
    ref.current = deleteAction;
  }, [selectedRows]);

  const key = 'otherPartyName' as keyof InvoiceRow;
  const filterString = filter.filterBy?.[key]?.like;

  return (
    <AppBarContentPortal
      sx={{
        paddingBottom: '16px',
        flex: 1,
        justifyContent: 'space-between',
        display: 'flex',
      }}
    >
      <InputWithLabelRow
        label={t('label.search')}
        labelWidth={null}
        Input={
          <BasicTextInput
            value={filterString}
            placeholder={t('placeholder.enter-a-customers-name')}
            onChange={e =>
              filter.onChangeStringFilterRule(
                'otherPartyName',
                'like',
                e.target.value
              )
            }
          />
        }
      />
      <DropdownMenu label="Select">
        <DropdownMenuItem IconComponent={DeleteIcon} onClick={deleteAction}>
          {t('button.delete-lines')}
        </DropdownMenuItem>
      </DropdownMenu>
    </AppBarContentPortal>
  );
};
