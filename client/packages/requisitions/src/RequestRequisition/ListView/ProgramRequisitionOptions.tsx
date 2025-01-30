import React, { useState } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  AutocompleteProps,
  Box,
  ButtonWithIcon,
  DefaultAutocompleteItemOption,
  EmergencyIcon,
  Grid,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { getNameOptionRenderer } from '@openmsupply-client/system';

import { OrderTypeRowFragment, SupplierProgramSettingsFragment } from '../api';
import { NewRequisitionType } from '../../types';

export interface NewProgramRequisition {
  type: NewRequisitionType.Program;
  programOrderTypeId: string;
  otherPartyId: string;
  periodId: string;
}

type Common<T> = Pick<
  AutocompleteProps<T>,
  'options' | 'value' | 'disabled' | 'renderOption' | 'getOptionDisabled'
> & {
  label: string;
  set: (value: T | null) => void;
  labelNoOptions?: string;
};

export const getOrderTypeRenderer =
  (): AutocompleteOptionRenderer<OrderTypeRowFragment> => (props, item) => (
    <DefaultAutocompleteItemOption {...props} key={item.id}>
      <Box display="flex" flexDirection="row" gap={1} alignItems="center">
        {item?.isEmergency && (
          <Box display="flex" alignItems="center">
            <EmergencyIcon />
          </Box>
        )}
        <Typography
          overflow="hidden"
          textOverflow="ellipsis"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </Typography>
      </Box>
    </DefaultAutocompleteItemOption>
  );

const useProgramRequisitionOptions = (
  programSettings: SupplierProgramSettingsFragment[]
) => {
  type ProgramSetting = SupplierProgramSettingsFragment;
  // [number] gets type of array
  type OrderType = SupplierProgramSettingsFragment['orderTypes'][number];
  type Supplier = SupplierProgramSettingsFragment['suppliers'][number];
  type Period = OrderType['availablePeriods'][number];

  const [program, setProgram] = useState<ProgramSetting | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const t = useTranslation();

  const handleSetProgram = (value: ProgramSetting | null) => {
    setProgram(value);
    setOrderType(null);
    setSupplier(null);
    setPeriod(null);
  };
  const handleSetOrderType = (value: OrderType | null) => {
    setOrderType(value);
    setPeriod(null);
  };

  const allOptions: {
    programs: Common<ProgramSetting>;
    orderTypes: Common<OrderType>;
    suppliers: Common<Supplier>;
    periods: Common<Period>;
  } = {
    programs: {
      options: programSettings,
      value: program,
      set: handleSetProgram,
      label: t('label.program'),
      disabled: false,
    },
    orderTypes: {
      options: program?.orderTypes || [],
      value: orderType,
      set: handleSetOrderType,
      disabled: program === null,
      labelNoOptions: t('messages.not-configured'),
      label: t('label.order-type'),
      renderOption: getOrderTypeRenderer(),
    },
    suppliers: {
      options: program?.suppliers || [],
      value: supplier,
      set: setSupplier,
      disabled: program === null,
      labelNoOptions: t('messages.not-configured'),
      label: t('label.supplier-name'),
      renderOption: getNameOptionRenderer(t('label.on-hold')),
      getOptionDisabled: (supplier: Supplier) => supplier.isOnHold,
    },
    periods: {
      options: orderType?.availablePeriods || [],
      value: period,
      set: setPeriod,
      disabled: orderType == null,
      labelNoOptions: t('messages.period-not-available'),
      label: t('label.period'),
    },
  };

  return {
    ...allOptions,
    createOptions:
      !!program && !!orderType && !!supplier && !!period
        ? {
            programOrderTypeId: orderType.id,
            otherPartyId: supplier.id,
            periodId: period.id,
          }
        : null,
  };
};

const LabelAndOptions = <T,>({
  label,
  options,
  disabled,
  labelNoOptions,
  set,
  value,
  autoFocus,
  optionKey,
  renderOption,
  getOptionDisabled,
}: Pick<AutocompleteProps<T>, 'optionKey' | 'autoFocus'> & Common<T>) => {
  const noOptionsDisplay = options.length == 0 &&
    !disabled &&
    !!labelNoOptions && <Typography>{labelNoOptions}</Typography>;

  return (
    <Grid container flexDirection="row">
      <Grid size={3} marginTop={-1}>
        <Typography>{label}</Typography>
      </Grid>
      <Grid>
        {noOptionsDisplay || (
          <Autocomplete
            width="450"
            renderOption={renderOption}
            getOptionDisabled={getOptionDisabled}
            autoFocus={autoFocus}
            options={options}
            optionKey={optionKey}
            value={value}
            disabled={disabled}
            onChange={(_, newValue) => set(newValue)}
            sx={{
              background: theme => theme.palette.background.toolbar,
              borderRadius: 2,
            }}
          />
        )}
      </Grid>
    </Grid>
  );
};

export const ProgramRequisitionOptions = ({
  programSettings,
  onCreate,
}: {
  onCreate: (props: NewProgramRequisition) => void;
  programSettings: SupplierProgramSettingsFragment[];
}) => {
  const { programs, orderTypes, suppliers, periods, createOptions } =
    useProgramRequisitionOptions(programSettings);
  const t = useTranslation();
  const ProgramOptionRenderer = getProgramOptionRenderer();

  return (
    <Grid container paddingTop={2} direction="column">
      <LabelAndOptions
        {...programs}
        renderOption={ProgramOptionRenderer}
        optionKey="programName"
        autoFocus={true}
      />
      <LabelAndOptions {...suppliers} optionKey="name" />
      <LabelAndOptions {...orderTypes} optionKey="name" />
      <LabelAndOptions {...periods} optionKey="name" />
      <Grid>
        <Typography
          sx={{
            fontStyle: 'italic',
            color: 'gray.main',
            fontSize: '12px',
            paddingLeft: 20,
            marginBottom: 0,
          }}
        >
          {t('message.program-period')}
        </Typography>
        <LabelAndOptions {...periods} optionKey="name" />
      </Grid>
      <Grid display="flex" justifyContent="center">
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          disabled={!createOptions}
          label={t('label.create')}
          onClick={() => {
            if (!createOptions) return;
            onCreate({
              type: NewRequisitionType.Program,
              ...createOptions,
            });
          }}
        />
      </Grid>
    </Grid>
  );
};

const getProgramOptionRenderer =
  (): AutocompleteOptionRenderer<SupplierProgramSettingsFragment> =>
  (props, item) => (
    <DefaultAutocompleteItemOption {...props} key={item.programId}>
      <Box display="flex" flexDirection="row" gap={1} alignItems="center">
        <Typography
          overflow="hidden"
          textOverflow="ellipsis"
          sx={{
            whiteSpace: 'nowrap',
          }}
        >
          {item.programName} ({item.tagName})
        </Typography>
      </Box>
    </DefaultAutocompleteItemOption>
  );
