import React from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Tooltip,
  useParams,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { NameFragment } from 'packages/system/src/Name/api/operations.generated';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const { purchaseOrderId = '' } = useParams();
  const {
    query: { data, isLoading },
  } = usePurchaseOrder(purchaseOrderId);

  const { supplier, reference } = data ?? {};

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
          {supplier && (
            <InputWithLabelRow
              label={t('label.supplier-name')}
              Input={
                <InternalSupplierSearchInput
                  disabled={isDisabled || isLoading}
                  value={(supplier as NameFragment) ?? null}
                  onChange={supplier => {
                    console.log('TO-DO: Update supplier', supplier.name);
                    // update({ supplier });
                  }}
                />
              }
            />
          )}
          <InputWithLabelRow
            label={t('label.supplier-ref')}
            Input={
              <Tooltip title={reference} placement="bottom-start">
                <BufferedTextInput
                  disabled={isDisabled}
                  size="small"
                  sx={{ width: 250 }}
                  value={reference ?? null}
                  onChange={e => {
                    console.log('TO-DO: Update reference', e.target.value);
                    // update({ reference: e.target.value });
                  }}
                />
              </Tooltip>
            }
          />
        </Grid>
      </Grid>
      <Grid
        display="flex"
        gap={1}
        alignItems="flex-end"
        justifyContent="flex-end"
        sx={{ marginTop: 1, flexWrap: 'wrap' }}
      >
        <Grid display="flex" gap={1} alignItems="flex-end">
          <SearchBar
            placeholder={t('placeholder.filter-items')}
            value={''}
            onChange={newValue => {
              console.log('TO-DO: Set item filter with:', newValue);
              // setItemFilter(newValue);
            }}
            debounceTime={0}
          />
        </Grid>
      </Grid>
    </AppBarContentPortal>
  );
};
