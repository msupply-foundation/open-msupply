import React from 'react';
import {
  AppBarContentPortal,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  useTranslation,
  SearchBar,
  Tooltip,
} from '@openmsupply-client/common';
import { InternalSupplierSearchInput } from '@openmsupply-client/system';
import { usePurchaseOrder } from '../api/hooks/usePurchaseOrder';
import { NameFragment } from 'packages/system/src/Name/api/operations.generated';

interface ToolbarProps {
  isDisabled?: boolean;
}

export const Toolbar = ({ isDisabled }: ToolbarProps) => {
  const t = useTranslation();
  const {
    query: { data, isLoading },
    lines: { itemFilter, setItemFilter },
  } = usePurchaseOrder();

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
                    // eslint-disable-next-line no-console
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
                    // eslint-disable-next-line no-console
                    console.log('TO-DO: Update reference', e.target.value);
                    // update({ reference: e.target.value });
                  }}
                />
              </Tooltip>
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
