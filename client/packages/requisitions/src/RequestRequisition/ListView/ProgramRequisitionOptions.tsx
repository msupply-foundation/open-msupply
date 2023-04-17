import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteOption,
  ButtonWithIcon,
  Grid,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';

import { ProgramSettingsFragment } from '../api';
import { NewRequisitionType } from './types';

export interface NewProgramRequistion {
  type: NewRequisitionType.Program;
  orderTypeId: string;
  otherPartyId: string;
  periodId: string;
}

const useProgramRequisitionOptions = (
  programSettings: ProgramSettingsFragment[]
) => {
  type ProgramSetting = ProgramSettingsFragment;
  // [number] gets type of array
  type OrderType = ProgramSettingsFragment['orderTypes'][number];
  type Supplier = ProgramSettingsFragment['suppliers'][number];
  type Period = OrderType['availablePeriods'][number];

  const [program, setProgram] = useState<ProgramSetting | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);
  const t = useTranslation('replenishment');

  useEffect(() => {
    setOrderType(null);
    setSupplier(null);
  }, [program]);

  useEffect(() => {
    setPeriod(null);
  }, [orderType]);

  return {
    programs: {
      options: programSettings,
      value: program,
      set: setProgram,
      label: t('label.program'),
      disabled: false,
    },
    orderTypes: {
      options: program?.orderTypes || [],
      value: orderType,
      set: setOrderType,
      disabled: program === null,
      labelNoOptions: t('messages.not-configured'),
      label: t('label.order-type'),
    },
    suppliers: {
      options: program?.suppliers || [],
      value: supplier,
      set: setSupplier,
      disabled: program === null,
      labelNoOptions: t('messages.not-configured'),
      // TODO supplier on hold ?
      label: t('label.supplier-name'),
    },
    periods: {
      options: orderType?.availablePeriods || [],
      value: period,
      set: setPeriod,
      disabled: orderType == null,
      labelNoOptions: t('messages.period-not-available'),
      label: t('label.period'),
    },
    createOptions:
      !!program && !!orderType && !!supplier && !!period
        ? {
            orderTypeId: orderType.id,
            otherPartyId: supplier.id,
            periodId: period.id,
          }
        : null,
  };
};

const LabelAndOptions = <T extends unknown>({
  label,
  options,
  disabled,
  labelNoOptions,
  set,
  value,
  autoFocus,
}: {
  label: string;
  options: AutocompleteOption<T>[];
  value: AutocompleteOption<T> | null;
  set: (value: T | null) => void;
  disabled: boolean;
  labelNoOptions?: string;
  autoFocus?: boolean;
}) => {
  const noOptionsDisplay = options.length == 0 &&
    !disabled &&
    !!labelNoOptions && <Typography>{labelNoOptions}</Typography>;

  return (
    <Grid item container spacing={2} direction="row">
      <Grid xs={3} item>
        <Typography>{label}</Typography>
      </Grid>
      <Grid item>
        {noOptionsDisplay || (
          <Autocomplete
            width="300"
            autoFocus={autoFocus}
            options={options}
            value={value}
            disabled={disabled}
            onChange={(_, newValue) => set(newValue)}
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
  onCreate: (props: NewProgramRequistion) => void;
  programSettings: ProgramSettingsFragment[];
}) => {
  const { programs, orderTypes, suppliers, periods, createOptions } =
    useProgramRequisitionOptions(programSettings);
  const t = useTranslation();

  return (
    <Grid
      container
      paddingTop={2}
      spacing="15"
      direction="column"
      justifyContent="center"
      alignItems="center"
    >
      <LabelAndOptions {...programs} autoFocus={true} />
      <LabelAndOptions {...suppliers} />
      <LabelAndOptions {...orderTypes} />
      <LabelAndOptions {...periods} />
      <Grid item>
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          disabled={!createOptions}
          label={t('label.new')}
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
