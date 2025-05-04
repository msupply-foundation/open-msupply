import React, { useState } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  AutocompleteProps,
  BasicSpinner,
  Box,
  ButtonWithIcon,
  CustomerProgramRequisitionSettingNode,
  DefaultAutocompleteItemOption,
  Grid,
  MasterListAndOrderAndPeriodTypesNode,
  NameNode,
  PlusCircleIcon,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import { getNameOptionRenderer } from '@openmsupply-client/system';

import { useResponse } from '../api';
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
  optionKey?: keyof T;
};

const useProgramRequisitionOptions = (
  data: CustomerProgramRequisitionSettingNode | undefined,
  customerOptions: NameNode[],
  setCustomer: (customer: NameNode | null) => void,
  customer: NameNode | null
) => {
  const t = useTranslation();
  type Programs = CustomerProgramRequisitionSettingNode['masterLists'];
  type Program = Programs[number];
  type OrderType = Program['orderTypes'][number];
  type Period = OrderType['availablePeriods'][number];
  type Customer = NameNode;

  const [program, setProgram] = useState<Program | null>(null);
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [period, setPeriod] = useState<Period | null>(null);

  const handleSetProgram = (value: Program | null) => {
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
    programs: Common<Program>;
    orderTypes: Common<OrderType>;
    customers: Common<Customer>;
    periods: Common<Period>;
  } = {
    programs: {
      options: (data?.masterLists ?? []).map(program => ({
        __typename: 'MasterListAndOrderAndPeriodTypesNode',
        masterList: program.masterList,
        orderTypes: program.orderTypes,
      })),
      value: program,
      disabled: customer === null,
      set: handleSetProgram,
      label: t('label.program'),
      renderOption: getProgramOptionRenderer(),
    },
    orderTypes: {
      options:
        program?.orderTypes?.filter(
          (orderType: OrderType) => orderType.availablePeriods.length > 0
        ) || [],
      value: orderType,
      set: handleSetOrderType,
      disabled: program === null || customer === null,
      labelNoOptions: t('messages.not-configured'),
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

  console.log('value', value);

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
            onChange={(_, newValue) => {
              set(newValue);
            }}
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
  customerOptions: NameNode[];
  onChangeCustomer: (customer: NameNode | null) => void;
  customer: NameNode | null;
}) => {
  const { data, isLoading } =
    useResponse.utils.programRequisitionSettingsByCustomer(customer?.id ?? '');

  const { programs, orderTypes, periods, customers, createOptions } =
    useProgramRequisitionOptions(
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
      <LabelAndOptions
        {...programs}
        renderOption={ProgramOptionRenderer}
        optionKey="masterList"
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
  (): AutocompleteOptionRenderer<MasterListAndOrderAndPeriodTypesNode> =>
  (props, item) => {
    console.log('item', item);
    console.log('props', props);
    console.log('item.masterList.name', item.masterList.name);
    return (
      <DefaultAutocompleteItemOption {...props} key={item.masterList.id}>
        <Box display="flex" flexDirection="row" gap={1} alignItems="center">
          <Typography
            overflow="hidden"
            textOverflow="ellipsis"
            sx={{
              whiteSpace: 'nowrap',
            }}
          >
            {item.masterList.name}
          </Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };
