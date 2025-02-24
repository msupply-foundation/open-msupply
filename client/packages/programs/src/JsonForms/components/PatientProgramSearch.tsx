import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Box, DetailInputWithLabelRow } from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_GAP, FORM_LABEL_WIDTH } from '../common';
import { PatientProgramSearchInput } from '../../Components';
import { DocumentRegistryFragment } from '../../api';

export const patientProgramSearchTester = rankWith(
  10,
  uiTypeIs('PatientProgramSearch')
);

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;

  const [program, setProgram] = React.useState<DocumentRegistryFragment | null>(
    null
  );

  const onChangeProgram = async (program: DocumentRegistryFragment) => {
    setProgram(program);
    handleChange(path, program.contextId);
  };

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Box display="flex" alignItems="center" gap={FORM_GAP} width="100%">
          <PatientProgramSearchInput
            onChange={onChangeProgram}
            value={program}
          />
        </Box>
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

export const PatientProgramSearch =
  withJsonFormsControlProps(UIComponentWrapper);
