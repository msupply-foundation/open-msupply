import React, { useState } from 'react';
import {
  BasicSpinner,
  Box,
  useDialog,
  DialogButton,
  AutocompleteList,
  Checkbox,
  TextField,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useStockItemsWithStats } from '../../api';
import { ItemRowWithStatsFragment } from '../../api/operations.generated';

interface StockItemSelectModalProps {
  extraFilter?: (item: ItemRowWithStatsFragment) => boolean;
  isOpen: boolean;
  onClose: () => void;
  onChange: (() => Promise<void>) | (() => void);
}

export const StockItemSelectModal = ({
  extraFilter,
  isOpen,
  onChange,
  onClose,
}: StockItemSelectModalProps) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('common');
  const { data, isLoading: loading } = useStockItemsWithStats();
  const [saving, setSaving] = useState(false);
  // const options = data?.nodes
  //   ? defaultOptionMapper<ItemRowFragment>(data?.nodes, 'name')
  //   : [];

  const options = extraFilter
    ? data?.nodes?.filter(extraFilter) ?? []
    : data?.nodes ?? [];

  return (
    <Modal
      title={t('heading.select-items')}
      width={650}
      height={600}
      cancelButton={
        <DialogButton disabled={loading} variant="cancel" onClick={onClose} />
      }
      okButton={
        <DialogButton
          disabled={saving}
          variant="ok"
          onClick={async () => {
            setSaving(true);
            await onChange();
            setSaving(false);
            onClose();
          }}
        />
      }
    >
      <Box flex={1} display="flex" justifyContent="center">
        {!saving ? (
          <AutocompleteList
            options={options}
            loading={loading}
            height={400}
            width={600}
            disableCloseOnSelect
            multiple
            getOptionLabel={option => option.name}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={t('placeholder.search-by-name-or-code')}
              />
            )}
            limitTags={3}
            renderOption={(props, option, { selected }) => (
              <li {...props}>
                <Checkbox checked={selected} />
                <span
                  style={{
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    width: 100,
                  }}
                >
                  {option.code}
                </span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {option.name}
                </span>
              </li>
            )}
          />
        ) : (
          <Box sx={{ height: '100%' }}>
            <BasicSpinner messageKey="saving" />
          </Box>
        )}
      </Box>
    </Modal>
  );
};
