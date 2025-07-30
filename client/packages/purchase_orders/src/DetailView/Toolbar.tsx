import React, { useState } from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Tooltip,
  useDebounceCallback,
  DateTimePickerInput,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { NameFragment } from 'packages/system/src/Name/api/operations.generated';

const DEBOUNCED_TIME = 1000;

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const {
    query: { data, isLoading },
    lines: { itemFilter, setItemFilter },
    update: { update },
  } = usePurchaseOrder();

  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState(
    DateUtils.getDateOrNull(data?.requestedDeliveryDate)
  );

  const handleDebouncedUpdate = useDebounceCallback(update, [], DEBOUNCED_TIME);

  return (
    <AppBarContentPortal
      sx={{
        display: 'flex',
        flex: 1,
        marginBottom: 1,
        flexDirection: 'column',
      }}
    >
      <Grid container gap={2} flexWrap="nowrap">
        <Grid display="flex" flex={1} flexDirection="column" gap={1}>
          {data?.supplier && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <InternalSupplierSearchInput
                  disabled={isDisabled || isLoading}
                  value={(data?.supplier as NameFragment) ?? null}
                  onChange={supplier => {
                    if (!supplier) return;
                    update({ supplierId: supplier?.id });
                  }}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={data?.reference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={data?.reference ?? null}
                  onChange={e => {
                    handleDebouncedUpdate({ reference: e.target.value });
                  }}
                />
              </Tooltip>
            }
          />
          <InputWithLabelRow
            label={t('label.requested-delivery-date')}
            Input={
              <DateTimePickerInput
                value={requestedDeliveryDate}
                onChange={date => {
                  setRequestedDeliveryDate(date);
                  const formattedDate = Formatter.naiveDate(date);
                  update({
                    requestedDeliveryDate: formattedDate,
                  });
                }}
              />
            }
          />
        </Grid>
        <SearchBar
          placeholder={t('placeholder.filter-items')}
          value={itemFilter ?? ''}
          onChange={newValue => setItemFilter(newValue)}
          debounceTime={0}
        />
      </Grid>
    </AppBarContentPortal>
  );
};
