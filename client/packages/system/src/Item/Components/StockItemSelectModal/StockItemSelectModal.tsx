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
import { useStockItemsWithStockLines } from '../../api';
import {
  ItemRowWithStatsFragment,
  StockLineFragment,
} from '../../api/operations.generated';

const MODAL_HEIGHT = 600;
const MODAL_WIDTH = 650;
const MODAL_COMPONENTS_HEIGHT = 235;

export type ItemWithStockLines = {
  itemId: string;
  stockLines?: StockLineFragment[];
};
interface StockItemSelectModalProps {
  extraFilter?: (item: ItemRowWithStatsFragment) => boolean;
  isOpen: boolean;
  onClose: () => void;
  onChange: (items?: ItemWithStockLines[]) => Promise<unknown>;
  disableBackdrop: boolean;
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
  disableBackdrop,
}: StockItemSelectModalProps) => {
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop });
  const t = useTranslation();
  const { data, isLoading } = useStockItemsWithStockLines();
  const [saving, setSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<ItemWithStockLines[]>([]);
  const onChangeSelectedItems = (ids: string[]) => {
    const items =
      data?.nodes
        .filter(item => ids.includes(item.id))
        .map(item => ({
          itemId: item.id,
          stockLines: item.availableBatches?.nodes ?? [],
        })) ?? [];
    setSelectedItems(items);
  };

  const options = extraFilter
    ? (data?.nodes?.filter(extraFilter) ?? [])
    : (data?.nodes ?? []);

  return (
    <Modal
      slideAnimation={false}
      title={t('heading.select-items')}
      width={MODAL_WIDTH}
      height={MODAL_HEIGHT}
      cancelButton={
        <DialogButton disabled={isLoading} variant="cancel" onClick={onClose} />
      }
      okButton={
        <DialogButton
          disabled={saving}
          variant="ok"
          onClick={async () => {
            setSaving(true);
            await onChange(selectedItems);
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
            onChange={onChangeSelectedItems}
            options={options}
            renderOption={renderOption}
            height={
              Math.min(window.innerHeight - 50, MODAL_HEIGHT) -
              MODAL_COMPONENTS_HEIGHT
            }
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
