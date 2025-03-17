import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  Box,
  DetailInputWithLabelRow,
  extractProperty,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_GAP, FORM_LABEL_WIDTH } from '../common';
import { PatientProgramSearchInput } from '../../Components';
import { DocumentRegistryFragment } from '../../api';

export const patientProgramSearchTester = rankWith(
  10,
  uiTypeIs('PatientProgramSearch')
);

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const [program, setProgram] = React.useState<DocumentRegistryFragment | null>(
    null
  );
  const programId = extractProperty(core?.data, 'programId');

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
            programId={programId}
            setProgram={setProgram}
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
