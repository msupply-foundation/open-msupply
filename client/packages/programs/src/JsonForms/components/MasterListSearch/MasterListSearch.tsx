import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  DetailInputWithLabelRow,
  extractProperty,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../../common';
import {
  MasterListSearchInput,
  MasterListRowFragment,
  useMasterLists,
} from '@openmsupply-client/system';

export const masterListSearchTester = rankWith(
  10,
  uiTypeIs('MasterListSearch')
);

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const masterListId = extractProperty(core?.data, path);
  const { data } = useMasterLists({
    queryParams: {
      filterBy: { id: { equalTo: masterListId ?? '' } },
    },
  });
  const selectedMasterList = data?.nodes[0] ?? null;

  const onChange = (masterList: MasterListRowFragment | null) => {
    handleChange(path, masterList ? masterList.id : null);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <MasterListSearchInput
          selectedMasterList={selectedMasterList}
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

export const MasterListSearch = withJsonFormsControlProps(UIComponentWrapper);
