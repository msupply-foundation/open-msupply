import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  extractProperty,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import {
  LocationSearchInput,
  LocationRowFragment,
  useLocationList,
} from '@openmsupply-client/system';

export const locationSearchTester = rankWith(10, uiTypeIs('LocationSearch'));

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const locationId = extractProperty(core?.data, path);
  const {
    query: { data },
  } = useLocationList({
    sortBy: { key: 'name', direction: 'asc' },
    filterBy: { id: { equalTo: locationId ?? '' } },
  });
  const selectedLocation = data?.nodes[0] ?? null;

  const onChange = (location: LocationRowFragment | null) => {
    handleChange(path, location ? location.id : null);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <LocationSearchInput
          selectedLocation={selectedLocation}
          onChange={onChange}
          width={250}
          disabled={false}
          clearable={true}
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

export const LocationSearch = withJsonFormsControlProps(UIComponentWrapper);
