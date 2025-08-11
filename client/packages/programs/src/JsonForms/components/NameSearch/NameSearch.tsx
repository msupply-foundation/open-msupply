import React, { useState } from 'react';
import { z } from 'zod';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import {
  createQueryParamsStore,
  DetailInputWithLabelRow,
  QueryParamsProvider,
  Typography,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../../common';
import {
  CustomerSearchInput,
  NameRowFragment,
  SupplierSearchInput,
} from '@openmsupply-client/system';

export const nameSearchTester = rankWith(10, uiTypeIs('NameSearch'));

const Options = z
  .object({
    nameType: z.enum(['customer', 'supplier']).optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const { errors: zErrors, options: schemaOptions } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );
  const { handleChange, label, path } = props;

  const [otherParty, setOtherParty] = useState<NameRowFragment | null>(null);

  const nameType = schemaOptions?.nameType;

  const onChange = (newVal: NameRowFragment | null) => {
    setOtherParty(newVal);
    handleChange(path, newVal ? newVal.id : null);
  };

  if (zErrors) return <Typography color="error">{zErrors}</Typography>;
  if (!nameType) return null;

  const SearchInput =
    nameType === 'customer' ? (
      <CustomerSearchInput
        value={otherParty}
        onChange={onChange}
        width={250}
        disabled={false}
      />
    ) : (
      <SupplierSearchInput
        value={otherParty}
        onChange={onChange}
        width={250}
        disabled={false}
      />
    );

  return (
    <QueryParamsProvider
      key={nameType}
      createStore={createQueryParamsStore<NameRowFragment>({
        initialSortBy: { key: 'name' },
      })}
    >
      <DetailInputWithLabelRow
        sx={DefaultFormRowSx}
        label={label}
        labelWidthPercentage={FORM_LABEL_WIDTH}
        inputAlignment={'start'}
        Input={SearchInput}
      />
    </QueryParamsProvider>
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const NameSearch = withJsonFormsControlProps(UIComponentWrapper);
