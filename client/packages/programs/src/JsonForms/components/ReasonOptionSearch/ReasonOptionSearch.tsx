import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  extractProperty,
  ReasonOptionNodeType,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import {
  ReasonOptionsSearchInput,
  useReasonOptions,
} from '@openmsupply-client/system';

export const reasonOptionSearchTester = rankWith(
  10,
  uiTypeIs('ReasonOptionSearch')
);

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const reasonOptionId = extractProperty(core?.data, path);
  const { data } = useReasonOptions();
  const selectedReasonOption =
    data?.nodes?.find(r => r.id === reasonOptionId) ?? null;

  const onChange = (reasonOption: { id: string; reason: string } | null) => {
    handleChange(path, reasonOption ? reasonOption.id : null);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <ReasonOptionsSearchInput
          value={selectedReasonOption}
          onChange={onChange}
          width={250}
          required={false}
          clearable
          type={[
            ReasonOptionNodeType.PositiveInventoryAdjustment,
            ReasonOptionNodeType.NegativeInventoryAdjustment,
          ]}
        />
      }
    />
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const ReasonOptionSearch = withJsonFormsControlProps(UIComponentWrapper);
