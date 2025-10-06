import React, { Dispatch, SetStateAction } from 'react';
import {
  DateTimePickerInput,
  InputWithLabelRow,
  RadioGroup,
} from '@common/components';
import { useTranslation } from '@common/intl';
import { FormControlLabel, Radio } from '@mui/material';
import {
  LocationSearchInput,
  MasterListSearchInput,
  VVMStatusSearchInput,
} from '@openmsupply-client/system';
import { Box, usePreferences } from '@openmsupply-client/common';
import { CreateStocktakeModalState } from './types';

const LABEL_FLEX = '0 0 150px';

export const StocktakeFilters = ({
  state: { masterList, location, vvmStatus, expiryDate, includeAllItems },
  setState,
}: {
  state: CreateStocktakeModalState;
  setState: Dispatch<SetStateAction<CreateStocktakeModalState>>;
}) => {
  const t = useTranslation();

  const { manageVvmStatusForStock } = usePreferences();

  return (
    <Box
      sx={{
        padding: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        marginLeft: 4,
      }}
    >
      <Box>
        <InputWithLabelRow
          labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
          Input={
            <MasterListSearchInput
              disabled={false}
              onChange={masterList =>
                setState(prev => ({
                  ...prev,
                  masterList,
                }))
              }
              selectedMasterList={masterList}
              width={380}
              placeholder={t('label.all-items')}
              clearable
            />
          }
          label={t('label.master-list')}
        />
        <RadioGroup
          value={includeAllItems}
          sx={{
            marginLeft: '160px',
            display: masterList ? undefined : 'none',
            transform: 'scale(0.9)',
          }}
          onChange={(_, value) => {
            setState(prev => ({
              ...prev,
              includeAllItems: value === 'true',
            }));
          }}
        >
          <FormControlLabel
            value={false}
            control={<Radio sx={{ padding: '4px' }} />}
            label={t('stocktake.items-with-soh')}
          />
          <FormControlLabel
            disabled={!masterList || !!expiryDate || !!location || !!vvmStatus}
            value={true}
            control={<Radio sx={{ padding: '4px' }} />}
            label={t('stocktake.all-master-list-items')}
          />
        </RadioGroup>
      </Box>

      <InputWithLabelRow
        labelProps={{
          sx: { flex: `${LABEL_FLEX}` },
        }}
        Input={
          <LocationSearchInput
            disabled={false}
            onChange={location =>
              setState(prev => ({
                ...prev,
                location,
                includeAllItems: false,
              }))
            }
            width={380}
            selectedLocation={location}
            placeholder={t('label.all-locations')}
            clearable
          />
        }
        label={t('label.location')}
      />
      <InputWithLabelRow
        labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
        Input={
          <DateTimePickerInput
            width={380}
            value={expiryDate}
            onChange={expiryDate =>
              setState(prev => ({
                ...prev,
                expiryDate,
                includeAllItems: false,
              }))
            }
          />
        }
        label={t('label.items-expiring-before')}
      />
      {manageVvmStatusForStock && (
        <InputWithLabelRow
          label={t('label.vvm-status')}
          labelProps={{ sx: { flex: `${LABEL_FLEX}` } }}
          Input={
            <VVMStatusSearchInput
              onChange={vvmStatus =>
                setState(prev => ({
                  ...prev,
                  vvmStatus: vvmStatus ?? null,
                  includeAllItems: false,
                }))
              }
              width={380}
              selected={vvmStatus}
              placeholder={t('label.all-statuses')}
              clearable
            />
          }
        />
      )}
    </Box>
  );
};
