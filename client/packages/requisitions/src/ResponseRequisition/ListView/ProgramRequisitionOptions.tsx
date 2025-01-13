import React, { useState } from 'react';
import {
  Autocomplete,
  AutocompleteProps,
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { getNameOptionRenderer } from '@openmsupply-client/system';

import { CustomerProgramSettingsFragment } from '../api';
import { NewRequisitionType } from '../../types';
import { getOrderTypeRenderer } from '../../RequestRequisition/ListView/ProgramRequisitionOptions';

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

const useProgramRequisitionOptions = (
  programSettings: CustomerProgramSettingsFragment[]
) => {
  const t = useTranslation();
  type ProgramSetting = CustomerProgramSettingsFragment;
  type CustomerAndOrderTypes =
    CustomerProgramSettingsFragment['customerAndOrderTypes'][number];
  type OrderType = CustomerAndOrderTypes['orderTypes'][number];
  type Customer = CustomerAndOrderTypes['customer'];
  type Period = OrderType['availablePeriods'][number];

  const [program, setProgram] = useState<ProgramSetting | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);

  const handleSetProgram = (value: ProgramSetting | null) => {
    setProgram(value);
    setOrderType(null);
    setCustomer(null);
    setPeriod(null);
  };
  const handleSetOrderType = (value: OrderType | null) => {
    setOrderType(value);
    setPeriod(null);
  };

  const allOptions: {
    programs: Common<ProgramSetting>;
    orderTypes: Common<OrderType>;
    customers: Common<Customer>;
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
      options:
        program?.customerAndOrderTypes
          .filter(c => c.customer.id === customer?.id)
          .flatMap(c => c.orderTypes) || [],
      value: orderType,
      set: handleSetOrderType,
      disabled: program === null || customer === null,
      labelNoOptions: t('messages.not-configured'),
      label: t('label.order-type'),
      renderOption: getOrderTypeRenderer(),
    },
    customers: {
      options: program?.customerAndOrderTypes.map(c => c.customer) || [],
      value: customer,
      set: setCustomer,
      disabled: program === null,
      labelNoOptions: t('messages.not-configured'),
      label: t('label.customer-name'),
      renderOption: getNameOptionRenderer(t('label.on-hold')),
      getOptionDisabled: (customer: Customer) => customer.isOnHold,
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
      !!program && !!orderType && !!customer && !!period
        ? {
            programOrderTypeId: orderType.id,
            otherPartyId: customer.id,
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
  programSettings: CustomerProgramSettingsFragment[];
}) => {
  const { programs, orderTypes, customers, periods, createOptions } =
    useProgramRequisitionOptions(programSettings);
  const t = useTranslation();

  return (
    <Grid container paddingTop={2} display="flex" direction="column">
      <LabelAndOptions {...programs} optionKey="programName" autoFocus={true} />
      <LabelAndOptions {...customers} optionKey="name" />
      <LabelAndOptions {...orderTypes} optionKey="name" />
      <LabelAndOptions {...periods} optionKey="name" />
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
