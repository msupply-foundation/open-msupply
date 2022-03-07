import React, { FC } from 'react';
import {
  Autocomplete,
  AppBarContentPortal,
  Box,
  InputWithLabelRow,
  BufferedTextInput,
  Grid,
  DropdownMenu,
  DropdownMenuItem,
  DeleteIcon,
  useTranslation,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { NameSearchInput } from '@openmsupply-client/system/src/Name';
import {
  useRequestFields,
  useIsRequestDisabled,
  useDeleteRequestLines,
} from '../api';

const months = [1, 2, 3, 4, 5, 6];

export const Toolbar: FC = () => {
  const t = useTranslation(['replenishment', 'common']);

  const { onDelete } = useDeleteRequestLines();
  const isDisabled = useIsRequestDisabled();
  const { minMonthsOfStock, theirReference, update, otherParty } =
    useRequestFields([
      'minMonthsOfStock',
      'maxMonthsOfStock',
      'theirReference',
      'otherParty',
    ]);
  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: 'This will change the minimum months of stock threshold',
  });

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Grid
        container
        flexDirection="row"
        display="flex"
        flex={1}
        alignItems="flex-end"
      >
        <Grid item display="flex" flex={1}>
          <Box display="flex" flexDirection="row" gap={4}>
            <Box display="flex" flex={1} flexDirection="column" gap={1}>
              {otherParty && (
                <InputWithLabelRow
                  label={t('label.supplier-name')}
                  Input={
                    <NameSearchInput
                      type="supplier"
                      disabled={isDisabled}
                      value={otherParty ?? null}
                      onChange={otherParty => {
                        update({ otherPartyId: otherParty.id });
                      }}
                    />
                  }
                />
              )}
              <InputWithLabelRow
                label={t('label.supplier-ref')}
                Input={
                  <BufferedTextInput
                    disabled={isDisabled}
                    size="small"
                    sx={{ width: 250 }}
                    value={theirReference}
                    onChange={e => update({ theirReference: e.target.value })}
                  />
                }
              />
            </Box>
          </Box>
        </Grid>
        <Box
          flexDirection="column"
          alignItems="flex-end"
          display="flex"
          gap={2}
        >
          <InputWithLabelRow
            labelWidth="150px"
            labelProps={{ sx: { fontSize: 12, fontWeight: 500 } }}
            label="Min. Months of Stock"
            Input={
              <Autocomplete
                clearIcon={null}
                isOptionEqualToValue={(a, b) => a.value === b.value}
                value={{
                  label: `${minMonthsOfStock} months`,
                  value: minMonthsOfStock,
                }}
                width="150px"
                options={months.map(m => ({
                  label: `${m} months`,
                  value: m,
                }))}
                onChange={(_, option) =>
                  option &&
                  getConfirmation({
                    onConfirm: () => update({ minMonthsOfStock: option.value }),
                  })
                }
              />
            }
          />
          <DropdownMenu disabled={isDisabled} label={t('label.select')}>
            <DropdownMenuItem IconComponent={DeleteIcon} onClick={onDelete}>
              {t('button.delete-lines', { ns: 'distribution' })}
            </DropdownMenuItem>
          </DropdownMenu>
        </Box>
      </Grid>
    </AppBarContentPortal>
  );
};
