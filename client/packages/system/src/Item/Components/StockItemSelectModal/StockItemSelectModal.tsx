import React, { useState } from 'react';
import {
  BasicSpinner,
  Box,
  useDialog,
  DialogButton,
  Checkbox,
  AutocompleteOptionRenderer,
  AutocompleteMultiList,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useStockItemsWithStats } from '../../api';
import { ItemRowWithStatsFragment } from '../../api/operations.generated';

interface StockItemSelectModalProps {
  extraFilter?: (item: ItemRowWithStatsFragment) => boolean;
  isOpen: boolean;
  onClose: () => void;
  onChange: (itemIds?: string[]) => Promise<any>;
}

const renderOption: AutocompleteOptionRenderer<ItemRowWithStatsFragment> = (
  props,
  option,
  { selected }
): JSX.Element => (
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
);

export const StockItemSelectModal = ({
  extraFilter,
  isOpen,
  onChange,
  onClose,
}: StockItemSelectModalProps) => {
  const { Modal } = useDialog({ isOpen, onClose });
  const t = useTranslation('inventory');
  const { data, isLoading } = useStockItemsWithStats();
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const onChangeSelectedIds = (ids: string[]) => setSelectedIds(ids);

  const options = extraFilter
    ? data?.nodes?.filter(extraFilter) ?? []
    : data?.nodes ?? [];

  return (
    <Modal
      slideAnimation={false}
      title={t('heading.select-items')}
      width={650}
      height={600}
      cancelButton={
        <DialogButton disabled={isLoading} variant="cancel" onClick={onClose} />
      }
      okButton={
        <DialogButton
          disabled={saving}
          variant="ok"
          onClick={async () => {
            setSaving(true);
            await onChange(selectedIds);
            setSaving(false);
            onClose();
          }}
        />
      }
    >
      <Box flex={1} display="flex" justifyContent="center">
        {!saving ? (
          <AutocompleteMultiList
            filterPlaceholder={t('placeholder.search-by-name-or-code')}
            filterProperties={['name', 'code']}
            getOptionLabel={option => `${option.code} ${option.name}`}
            isLoading={isLoading}
            onChange={onChangeSelectedIds}
            options={options}
            renderOption={renderOption}
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
