import React, { FC, useState } from 'react';
import {
  BasicSpinner,
  Box,
  useDialog,
  DialogButton,
  AutocompleteList,
  Checkbox,
  TextField,
  Typography,
  AutocompleteRenderInputParams,
  AutocompleteOptionRenderer,
  AutocompleteOnChange,
  RegexUtils,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { useStockItemsWithStats } from '../../api';
import { ItemRowWithStatsFragment } from '../../api/operations.generated';

interface StockItemSelectModalProps {
  extraFilter?: (item: ItemRowWithStatsFragment) => boolean;
  isOpen: boolean;
  onClose: () => void;
  onChange: (itemIds?: string[]) => void;
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
  const { data, isLoading: loading } = useStockItemsWithStats();
  const [saving, setSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<
    ItemRowWithStatsFragment[]
  >([]);
  const [inputValue, setInputValue] = useState('');

  const options = extraFilter
    ? data?.nodes?.filter(extraFilter) ?? []
    : data?.nodes ?? [];

  const onChangeItems: AutocompleteOnChange<
    ItemRowWithStatsFragment | ItemRowWithStatsFragment[]
  > = (_event, items) => setSelectedItems(items instanceof Array ? items : []);

  const selectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = options.filter(option =>
      RegexUtils.matchObjectProperties(inputValue, option, ['name', 'code'])
    );
    if (event.target.checked) {
      setSelectedItems([...selectedItems, ...filtered]);
    } else {
      const filteredIds = filtered.map(item => item.id);
      setSelectedItems(
        selectedItems.filter(item => !filteredIds.includes(item.id))
      );
    }
  };

  const ItemInput: FC<AutocompleteRenderInputParams> = props => {
    const { InputProps, ...rest } = props;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { startAdornment, ...restInputProps } = InputProps ?? {};
    const t = useTranslation('common');
    const filtered = options.filter(option =>
      RegexUtils.matchObjectProperties(inputValue, option, ['name', 'code'])
    );

    const selectedIds = selectedItems.map(item => item.id);
    const filteredSelectedCount = filtered.filter(item =>
      selectedIds.includes(item.id)
    ).length;
    const indeterminate =
      filteredSelectedCount > 0 && filteredSelectedCount < filtered.length;
    const checked =
      filteredSelectedCount > 0 && filteredSelectedCount === filtered.length;

    return (
      <>
        <Box display="flex">
          <Typography
            flex={1}
            style={{ verticalAlign: 'bottom' }}
            display="flex"
            alignItems="center"
          >
            {t('label.items-selected', { count: selectedItems.length })}
          </Typography>
          <Typography textAlign="right" flex={1}>
            {t('label.select-all')}
            <Checkbox
              onChange={selectAll}
              indeterminate={indeterminate}
              checked={checked}
            />
          </Typography>
        </Box>
        <TextField
          autoFocus
          InputProps={restInputProps}
          {...rest}
          placeholder={t('placeholder.search-by-name-or-code')}
          onChange={e => setInputValue(e.target.value)}
        />
      </>
    );
  };

  return (
    <Modal
      slideAnimation={false}
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
            await onChange(selectedItems.map(item => item.id));
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
            height={365}
            width={600}
            disableCloseOnSelect
            multiple
            getOptionLabel={option => `${option.code} ${option.name}`}
            filterOptions={(options, state) =>
              options.filter(option =>
                RegexUtils.matchObjectProperties(state.inputValue, option, [
                  'name',
                  'code',
                ])
              )
            }
            renderInput={ItemInput}
            limitTags={0}
            renderOption={renderOption}
            onChange={onChangeItems}
            inputValue={inputValue}
            clearText={t('label.clear-selection')}
            value={selectedItems}
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
