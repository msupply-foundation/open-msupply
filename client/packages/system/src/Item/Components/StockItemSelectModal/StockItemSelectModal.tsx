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

const ItemInput: FC<AutocompleteRenderInputParams> = props => {
  const { InputProps, ...rest } = props;
  const { startAdornment, ...restInputProps } = InputProps ?? {};
  const t = useTranslation('common');
  const length =
    startAdornment && startAdornment instanceof Array
      ? startAdornment.length
      : 0;
  return (
    <>
      <Typography>{length} items selected</Typography>
      <TextField
        autoFocus
        InputProps={restInputProps}
        {...rest}
        placeholder={t('placeholder.search-by-name-or-code')}
      />
    </>
  );
};

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
            height={375}
            width={600}
            disableCloseOnSelect
            multiple
            getOptionLabel={option => option.name}
            renderInput={ItemInput}
            limitTags={0}
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
