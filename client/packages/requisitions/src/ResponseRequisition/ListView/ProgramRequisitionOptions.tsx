import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  AutocompleteOptionRenderer,
  AutocompleteProps,
  BasicSpinner,
  Box,
  ButtonWithIcon,
  DefaultAutocompleteItemOption,
  Grid,
  NameNode,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { getNameOptionRenderer } from '@openmsupply-client/system';
import {
  AvailablePeriodFragment,
  ProgramSettingFragment,
  ProgramRequisitionOrderTypeFragment,
  ProgramSettingsByCustomerFragment,
} from '../api/operations.generated';

import { useResponse } from '../api';
import { NewRequisitionType } from '../../types';
import { getOrderTypeRenderer } from '../../RequestRequisition/ListView/ProgramRequisitionOptions';
import { NameRowFragment } from '@openmsupply-client/system';

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
  optionKey?: keyof T;
};

const useProgramRequisitionOptions = (
  data: ProgramSettingsByCustomerFragment | undefined,
  customerOptions: NameRowFragment[],
  setCustomer: (customer: NameRowFragment | null) => void,
  customer: NameRowFragment | null
) => {
  const t = useTranslation();
  type Program = ProgramSettingFragment;
  type OrderType = ProgramRequisitionOrderTypeFragment;
  type Period = AvailablePeriodFragment;
  type Customer = NameRowFragment;

  const [programSetting, setProgram] =
    useState<ProgramSettingFragment | null>();
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);

  const handleSetProgram = (value: ProgramSettingFragment | null) => {
    setProgram(value);
    setOrderType(null);
    setPeriod(null);
  };
  const handleSetOrderType = (value: OrderType | null) => {
    setOrderType(value);
    setPeriod(null);
  };
  const handleSetCustomer = (value: NameNode | null) => {
    setCustomer(value);
    setProgram(null);
    setOrderType(null);
    setPeriod(null);
  };

  const allOptions: {
    programSettings: Common<Program>;
    orderTypes: Common<OrderType>;
    customers: Common<Customer>;
    periods: Common<Period>;
  } = {
    programSettings: {
      options: data?.programSettings ?? [],
      value: programSetting,
      disabled: customer === null,
      set: handleSetProgram,
      label: t('label.program'),
      labelNoOptions: t('label.no-program-options'),
    },
    orderTypes: {
      options: programSetting?.orderTypes ?? [],
      value: orderType,
      set: handleSetOrderType,
      disabled: programSetting === null || programSetting === undefined,
      labelNoOptions: t('label.no-order-types'),
      label: t('label.order-type'),
      renderOption: getOrderTypeRenderer(),
    },
    customers: {
      options: customerOptions,
      value: customer,
      set: value => handleSetCustomer(value as NameNode | null),
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
      !!programSetting && !!orderType && !!customer && !!period
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
  customerOptions,
  onCreate,
  onChangeCustomer,
  customer,
}: {
  onCreate: (props: NewProgramRequisition) => void;
  customerOptions: NameRowFragment[];
  onChangeCustomer: (customer: NameRowFragment | null) => void;
  customer: NameRowFragment | null;
}) => {
  const { data, isLoading } =
    useResponse.utils.programRequisitionSettingsByCustomer(customer?.id ?? '');

  const {
    programSettings: programs,
    orderTypes,
    periods,
    customers,
    createOptions,
  } = useProgramRequisitionOptions(
    data,
    customerOptions,
    onChangeCustomer,
    customer
  );

  const t = useTranslation();
  const ProgramOptionRenderer = getProgramOptionRenderer();
  if (isLoading) return <BasicSpinner />;

  return (
    <Grid container paddingTop={2} direction="column">
      <LabelAndOptions {...customers} optionKey="name" />
      {customer?.store && (
        <Box sx={{ pb: 2, display: 'flex', justifyContent: 'center' }}>
          <Alert severity="warning" style={{ marginBottom: 2 }}>
            {t('warning.manual-store-requisition')}
          </Alert>
        </Box>
      )}
      <LabelAndOptions
        {...programs}
        renderOption={ProgramOptionRenderer}
        optionKey="masterListName"
        autoFocus={true}
      />
      <LabelAndOptions {...orderTypes} optionKey="name" />
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
  (): AutocompleteOptionRenderer<ProgramSettingFragment> => (props, item) => {
    return (
      <DefaultAutocompleteItemOption {...props} key={item.masterListId}>
        <Box display="flex" flexDirection="row" gap={1} alignItems="center">
          <Typography
            overflow="hidden"
            textOverflow="ellipsis"
            sx={{
              whiteSpace: 'nowrap',
            }}
          >
            {item.masterListName} ({item.masterListNameTagName})
          </Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };
